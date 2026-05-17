# Project Pulse

AI-powered project intelligence for enterprise software teams. Connects to GitHub, Jira, and Slack — detects risks and broadcasts real-time alerts before problems become disasters.

## Architecture

```
GitHub / Jira / Slack
        ↓ webhooks
   Express Backend  →  PostgreSQL (events, alerts, projects)
        ↓               Redis (caching)
   Claude AI (claude-sonnet-4-20250514)
        ↓ Socket.io
   React Frontend  (real-time alerts + developer feed)
```

## Prerequisites

- Node.js 20+
- Docker & Docker Compose (for containerized setup)
- Anthropic API key — get one at [console.anthropic.com](https://console.anthropic.com)

---

## Quick Start (Docker)

```bash
cd project-pulse

# Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# Start everything
docker compose up -d

# Open the UI
open http://localhost:80
```

Backend API is at `http://localhost:3001`.

---

## Local Development

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY and start postgres/redis locally

npm install
npm run dev       # ts-node-dev with hot reload on :3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev       # Vite dev server on :5173
```

The Vite config proxies `/api` and `/socket.io` to the backend automatically.

---

## Webhook Configuration

Point your integrations at the running backend:

| Service | Endpoint | Events to send |
|---------|----------|----------------|
| **GitHub** | `POST /api/github/webhook` | `push`, `pull_request`, `create`, `delete` |
| **Jira** | `POST /api/jira/webhook` | `jira:issue_updated`, `jira:issue_created` |
| **Slack** | `POST /api/slack/webhook` | `message` (Events API) |

For local testing, use [ngrok](https://ngrok.com): `ngrok http 3001`

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend port |
| `ANTHROPIC_API_KEY` | — | **Required.** Your Claude API key |
| `POSTGRES_HOST` | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_DB` | `project_pulse` | Database name |
| `POSTGRES_USER` | `postgres` | DB user |
| `POSTGRES_PASSWORD` | `postgres` | DB password |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `FRONTEND_URL` | `http://localhost:5173` | CORS origin |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_BACKEND_URL` | `http://localhost:3001` | Socket.io server URL |

---

## Database Schema

```sql
projects  (id, name, created_at)
events    (id, project_id, type, source, payload JSONB, created_at)
alerts    (id, project_id, severity, message, recommendation, created_at)
```

Schema is auto-created on first backend start via `initDB()`.

---

## How AI Analysis Works

1. Every **5 minutes** the alert service fetches the 50 most recent events
2. Events are sent to **Claude** (`claude-sonnet-4-20250514`) with a structured prompt
3. Claude returns a JSON object: `{ summary, risks[], recommendations[] }`
4. Each risk becomes an `alert` row in PostgreSQL
5. All connected clients receive updates via **Socket.io** instantly

You can also trigger manual analysis from the UI header ("Run Analysis" button).

---

## Project Structure

```
project-pulse/
├── backend/
│   └── src/
│       ├── db/          postgres.ts, redis.ts
│       ├── models/      Project.ts, Event.ts, Alert.ts
│       ├── routes/      github.ts, jira.ts, slack.ts
│       ├── services/    aiService.ts, githubService.ts, jiraService.ts, alertService.ts
│       ├── socket/      socketHandler.ts
│       └── index.ts
├── frontend/
│   └── src/
│       ├── components/  layout/, dashboard/, developer/
│       ├── pages/       Dashboard.tsx, DeveloperFeed.tsx
│       ├── hooks/       useSocket.ts
│       ├── types/       index.ts
│       └── App.tsx
└── docker-compose.yml
```
test