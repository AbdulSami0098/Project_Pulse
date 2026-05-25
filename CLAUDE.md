# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Backend** (from `backend/`):
```bash
npm run dev      # ts-node-dev with hot reload
npm run build    # tsc
npm start        # node dist/index.js (production)
```

**Frontend** (from `frontend/`):
```bash
npm run dev      # Vite dev server on port 5173
npm run build    # tsc + vite build
```

**Docker** (from repo root):
```bash
docker compose up   # PostgreSQL 15 + Redis 7
```

Env files are split per mode (mirrors Vite's behavior on the frontend, replicated on the backend via `src/loadEnv.ts`):

| File | Committed? | When loaded |
|---|---|---|
| `.env.development` | ✓ | `npm run dev` |
| `.env.production` | ✓ | `npm run build` (frontend) / `npm start` (backend) |
| `.env.development.local` | gitignored | dev mode, overrides committed defaults |
| `.env.production.local` | gitignored | prod mode, overrides committed defaults |

Personal values (ngrok URL, local DB credentials, real Anthropic key) go in the `.local` files. The committed files only contain non-secret defaults. See each app's `.env.example` for the full variable list with inline docs.

## Architecture

### Two separate apps
- **Backend**: Express + TypeScript + Socket.io on port 3001. Entry point: `backend/src/index.ts`.
- **Frontend**: React 18 + TypeScript + Tailwind + Vite on port 5173. Vite proxies `/api` and `/socket.io` to `localhost:3001` in dev — so frontend fetch calls can use just `/api/...` in theory, but all files currently use the `VITE_API_URL` constant instead for explicit control.

### Data flow
1. External tools (GitHub, Jira, Slack, MS Teams) POST to per-project webhook routes: `POST /api/projects/:id/webhooks/{github,jira,slack,teams}`.
2. The route handler calls the appropriate service (e.g. `githubService.ts`), which stores raw events in PostgreSQL via `getOrCreateProject`.
3. `alertService.ts` runs `runAlertCycleForProject(projectId)` on a 5-minute interval for every active project. It fetches recent events, calls Claude (`claude-sonnet-4-20250514`) to generate alerts, persists them, and emits `new_alert` / `alerts_refresh` to the project's Socket.io room (`project:{id}`).
4. If the project has a `teams_webhook` set, `teamsService.ts` sends an Adaptive Card notification to MS Teams.

### Database schema (PostgreSQL)
Tables: `projects`, `events`, `alerts`. Schema is auto-created by `initDB()` in `backend/src/db/postgres.ts` using `CREATE TABLE IF NOT EXISTS` plus `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for safe in-place migrations — no migration runner needed.

Key `projects` columns: `id, name, slug, description, github_repo, jira_url, slack_webhook, teams_webhook, status ('active'|'inactive'), created_at`.

### Socket.io rooms
Clients emit `join_project { project_id }` after connecting to subscribe to a project room (`project:{id}`). The server emits project-scoped `initial_data`, `new_alert`, `alerts_refresh`, `analysis_update`, and `tasks_update` only to that room. A legacy global `initial_data` is also emitted on connect for backward compatibility — the frontend `useSocket.ts` guards against this overwriting HTTP fetch results by only applying socket data when the array is non-empty.

### Frontend state management
`ProjectContext` (React Context) owns all project state: list, selected project, CRUD operations, loading/error. It persists `selectedProject.id` to `localStorage` under `project_pulse_selected_project_id` and clears it if the ID is no longer valid on the next fetch. All API calls in the context use `VITE_API_URL` and include the `ngrok-skip-browser-warning: '1'` header.

`useSocket(projectId)` handles Socket.io connection and returns `{ alerts, events, tasks, alertsSummary, analysis, connected, requestAnalysis }`. The socket is created once and reused across project switches; it only leaves/joins rooms.

### Key routing decisions
In `backend/src/index.ts`, the webhook router (`/api/projects/:id/webhooks`) is mounted **before** the projects CRUD router (`/api/projects`). This matters because Express would otherwise treat `/api/projects/:id/webhooks/github` as a match for the projects `/:id` GET route.

### Project Intelligence
`POST /api/projects/:id/query` accepts `{ question: string }`, fetches up to 200 recent events, formats them into human-readable lines, and calls Claude with a system prompt. Returns `{ answer }` or `{ error: "api_key_missing" }` when `ANTHROPIC_API_KEY` is absent or set to a placeholder.

### Dual-URL setup (important)

The frontend uses **two** separate base URLs by design. Both are centralized in
`frontend/src/lib/env.ts` — never read `import.meta.env.VITE_*` directly anywhere
else.

| Variable           | Purpose                                          | Dev value                            | Prod value                |
|--------------------|--------------------------------------------------|--------------------------------------|---------------------------|
| `VITE_API_URL`     | Internal API + Socket.io calls from the browser  | `http://localhost:3001`              | your deployed backend URL |
| `VITE_BACKEND_URL` | Public webhook URLs shown to users (Settings UI) | an ngrok tunnel to localhost:3001    | same as `VITE_API_URL`    |

Use them via:
- `import { API_URL } from '@/lib/env'` — every fetch / socket call.
- `import { getWebhookBaseUrl } from '@/lib/env'` — anywhere a webhook URL is rendered to a user (`Settings.tsx`, `ProjectSelector.tsx`'s `WebhookUrls` modal).

In production these two URLs are typically identical. The split only matters
in local development, where the browser talks to `localhost:3001` but external
services (GitHub, Jira, Slack, Teams) need a publicly-reachable URL — usually
an ngrok tunnel. **The ngrok URL is a placeholder; replace with your real
backend host before deploying.**

### Known security gaps (not yet addressed)
- Webhook routes do not verify HMAC signatures — see `// SECURITY TODO` comment in `backend/src/routes/projectWebhooks.ts`.
- No authentication on any endpoint. `/api/projects/:id/query` has a per-IP rate limit (10/min) as a stopgap against Anthropic-credit drain; add real auth before exposing publicly.
