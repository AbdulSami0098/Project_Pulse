import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createProject, getAllProjects, getProjectById, updateProject, deleteProject } from '../models/Project';
import { getAlertsByProject } from '../models/Alert';
import { getEventsByProject, Event } from '../models/Event';
import { getTasksFromEventsByProject, getAlertsSummaryByProject } from '../models/Task';
import { getLogsByProject } from '../models/Log';
import pool from '../db/postgres';

const router = Router();

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

// ── ID parsing ────────────────────────────────────────────────────────────────
// `parseInt('1abc')` returns 1, so we use stricter integer validation here to
// reject IDs like "1abc", "1.5", "" or "-1" with a 400 instead of silently
// matching the wrong row.
function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// ── Helper: format a raw DB event row into a human-readable context line ──────

function formatEvent(ev: Event): string {
  const ts = new Date(ev.created_at).toISOString().replace('T', ' ').slice(0, 19);
  const p = ev.payload as Record<string, unknown>;

  switch (ev.type) {
    case 'push': {
      const pusher = (p.pusher as string) ?? 'unknown';
      const commits = (p.commits as number) ?? 0;
      const ref = ((p.ref as string) ?? '').replace('refs/heads/', '');
      const msg = (p.head_commit_message as string) ?? '';
      return `[GitHub Push] ${pusher} pushed ${commits} commit(s) to ${ref}${msg ? ` — "${msg}"` : ''} — ${ts}`;
    }
    case 'pull_request': {
      const user = (p.user as string) ?? 'unknown';
      const action = (p.action as string) ?? '';
      const title = (p.title as string) ?? '';
      const repo = (p.repository as string) ?? '';
      return `[GitHub PR] ${user} ${action} PR "${title}" in ${repo} — ${ts}`;
    }
    case 'branch_created': {
      const sender = (p.sender as string) ?? 'unknown';
      const ref = (p.ref as string) ?? '';
      return `[GitHub Branch] ${sender} created branch "${ref}" — ${ts}`;
    }
    case 'branch_deleted': {
      const sender = (p.sender as string) ?? 'unknown';
      const ref = (p.ref as string) ?? '';
      return `[GitHub Branch] ${sender} deleted branch "${ref}" — ${ts}`;
    }
    case 'jira_issue': {
      const key = (p.issue_key as string) ?? '';
      const summary = (p.summary as string) ?? '';
      const status = (p.status as string) ?? '';
      const assignee = (p.assignee as string) ?? 'unassigned';
      const eventType = (p.event_type as string) ?? '';
      const action = eventType.includes('updated') ? 'updated' : eventType.includes('created') ? 'created' : 'changed';
      return `[Jira Issue] ${key}: "${summary}" ${action} → status: ${status}, assignee: ${assignee} — ${ts}`;
    }
    default:
      if (ev.source === 'slack') {
        const text = (p.text as string) ?? '';
        const user = (p.user as string) ?? 'unknown';
        return `[Slack] ${user}: "${text.slice(0, 120)}" — ${ts}`;
      }
      if (ev.source === 'teams') {
        const text = (p.text as string) ?? '';
        return `[Teams] "${text.slice(0, 120)}" — ${ts}`;
      }
      return `[${ev.source.toUpperCase()} ${ev.type}] ${JSON.stringify(p).slice(0, 120)} — ${ts}`;
  }
}

// ── CRUD routes ───────────────────────────────────────────────────────────────

router.get('/', async (_req: Request, res: Response) => {
  try {
    const projects = await getAllProjects();
    res.json(projects);
  } catch (err) {
    console.error('GET /api/projects failed:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const project = await createProject(req.body as Parameters<typeof createProject>[0]);
    res.status(201).json(project);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('POST /api/projects failed:', err);
    if (msg.includes('unique') || msg.includes('duplicate')) {
      res.status(409).json({ error: 'A project with that name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) { res.status(400).json({ error: 'Invalid project id' }); return; }

  try {
    const project = await getProjectById(id);
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

    // Single query — replaces three separate EXISTS round-trips.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = await pool.query<{ source: string }>(
      `SELECT DISTINCT source
       FROM events
       WHERE project_id = $1
         AND source IN ('github', 'jira', 'slack')
         AND created_at > $2`,
      [id, sevenDaysAgo]
    );
    const sources = new Set(recent.rows.map((r) => r.source));

    res.json({
      ...project,
      integrations: {
        github: sources.has('github'),
        jira: sources.has('jira'),
        slack: sources.has('slack'),
        teams: !!project.teams_webhook,
      },
    });
  } catch (err) {
    console.error(`GET /api/projects/${id} failed:`, err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) { res.status(400).json({ error: 'Invalid project id' }); return; }

  try {
    const project = await updateProject(id, req.body as Parameters<typeof updateProject>[1]);
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
    res.json(project);
  } catch (err) {
    console.error(`PUT /api/projects/${id} failed:`, err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) { res.status(400).json({ error: 'Invalid project id' }); return; }

  try {
    await deleteProject(id);
    res.status(204).send();
  } catch (err) {
    console.error(`DELETE /api/projects/${id} failed:`, err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ── Sub-resource routes ───────────────────────────────────────────────────────

router.get('/:id/events', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) { res.status(400).json({ error: 'Invalid project id' }); return; }

  try {
    const events = await getEventsByProject(id, 50);
    res.json(events);
  } catch (err) {
    console.error(`GET /api/projects/${id}/events failed:`, err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.get('/:id/alerts', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) { res.status(400).json({ error: 'Invalid project id' }); return; }

  try {
    const alerts = await getAlertsByProject(id, 20);
    res.json(alerts);
  } catch (err) {
    console.error(`GET /api/projects/${id}/alerts failed:`, err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.get('/:id/alerts/summary', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) { res.status(400).json({ error: 'Invalid project id' }); return; }

  try {
    const summary = await getAlertsSummaryByProject(id);
    res.json(summary);
  } catch (err) {
    console.error(`GET /api/projects/${id}/alerts/summary failed:`, err);
    res.status(500).json({ error: 'Failed to fetch alerts summary' });
  }
});

router.get('/:id/tasks', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) { res.status(400).json({ error: 'Invalid project id' }); return; }

  try {
    const tasks = await getTasksFromEventsByProject(id);
    res.json(tasks);
  } catch (err) {
    console.error(`GET /api/projects/${id}/tasks failed:`, err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// ── Logs ──────────────────────────────────────────────────────────────────────

router.get('/:id/logs', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) { res.status(400).json({ error: 'Invalid project id' }); return; }

  try {
    const logs = await getLogsByProject(id);
    res.json(logs);
  } catch (err) {
    console.error(`GET /api/projects/${id}/logs failed:`, err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// ── Project Intelligence query ────────────────────────────────────────────────
//
// Rate limited per-IP to protect against credit-drain abuse. This endpoint
// calls the Anthropic API on every request which bills directly to your
// account.
// TODO: Replace with real auth + per-user quotas before exposing publicly.

const QUERY_RATE_LIMIT_PER_MIN = 10;
const queryHits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = queryHits.get(ip);
  if (!entry || entry.resetAt < now) {
    queryHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > QUERY_RATE_LIMIT_PER_MIN;
}

function isApiKeyMissing(key: string): boolean {
  // A real Anthropic key looks like `sk-ant-...`. Anything else is either
  // unset or a placeholder copied straight from .env.example.
  if (!key) return true;
  if (key.toLowerCase().includes('your_')) return true;
  if (key.length < 20) return true;
  return false;
}

router.post('/:id/query', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) { res.status(400).json({ error: 'Invalid project id' }); return; }

  const ip = (req.ip || req.socket.remoteAddress || 'unknown').toString();
  if (rateLimited(ip)) {
    res.status(429).json({ error: 'rate_limited', message: 'Too many requests, slow down.' });
    return;
  }

  const { question } = req.body as { question?: string };
  if (!question?.trim()) {
    res.status(400).json({ error: 'question is required' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  if (isApiKeyMissing(apiKey)) {
    res.json({ answer: null, error: 'api_key_missing' });
    return;
  }

  try {
    // Fetch up to 200 events, most recent first
    const events = await getEventsByProject(id, 200);

    const eventsContext = events.length === 0
      ? 'No events have been recorded for this project yet.'
      : events.map(formatEvent).join('\n');

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system:
        'You are a project intelligence assistant. You have access to all events ' +
        'that happened in this project across GitHub, Jira, Slack and MS Teams. ' +
        'Answer questions accurately based only on the event data provided. ' +
        'Always include who did what, when, and correlate related events across tools ' +
        'when relevant. If you can\'t find the answer in the events, say so clearly.',
      messages: [
        {
          role: 'user',
          content: `Here are the project events (most recent first):\n\n${eventsContext}\n\n---\n\nQuestion: ${question.trim()}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected Claude response type');

    res.json({ answer: content.text });
  } catch (err) {
    console.error('Intelligence query error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

export default router;
