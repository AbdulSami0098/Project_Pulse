import './loadEnv'; // must come first — populates process.env from .env.{mode}[.local]
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import { initDB } from './db/postgres';
import githubRouter from './routes/github';
import jiraRouter from './routes/jira';
import slackRouter from './routes/slack';
import projectsRouter from './routes/projects';
import projectWebhooksRouter from './routes/projectWebhooks';
import { initSocketHandlers } from './socket/socketHandler';
import { initAlertService } from './services/alertService';
import { initLogJob } from './services/logJobService';
import { getRecentAlerts } from './models/Alert';
import { getRecentEvents } from './models/Event';
import { getTasksFromEvents, getAlertsSummary } from './models/Task';

const app = express();
const httpServer = createServer(app);

// CORS origin for the frontend.
// DEVELOPMENT: http://localhost:5173
// TODO: Replace with production frontend domain when deploying.
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: { origin: frontendUrl, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: frontendUrl }));
// Cap webhook payloads at 1 MB to prevent DoS via oversized JSON.
app.use(express.json({ limit: '1mb' }));

// Per-project webhook routes
app.use('/api/projects/:id/webhooks', projectWebhooksRouter);

// Per-project CRUD + data routes
app.use('/api/projects', projectsRouter);

// Legacy webhook routes (kept for backward compatibility)
app.use('/api/github', githubRouter);
app.use('/api/jira', jiraRouter);
app.use('/api/slack', slackRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Legacy global endpoints (kept for backward compatibility)
app.get('/api/alerts', async (_req, res) => {
  try {
    const alerts = await getRecentAlerts(20);
    res.json(alerts);
  } catch (err) {
    console.error('GET /api/alerts failed:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

app.get('/api/events', async (_req, res) => {
  try {
    const events = await getRecentEvents(50);
    res.json(events);
  } catch (err) {
    console.error('GET /api/events failed:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.get('/api/alerts/summary', async (_req, res) => {
  try {
    const summary = await getAlertsSummary();
    res.json(summary);
  } catch (err) {
    console.error('GET /api/alerts/summary failed:', err);
    res.status(500).json({ error: 'Failed to fetch alerts summary' });
  }
});

// Legacy tasks endpoint — now superseded by /api/projects/:id/tasks
app.get('/api/tasks', async (_req, res) => {
  try {
    const tasks = await getTasksFromEvents();
    res.json(tasks);
  } catch (err) {
    console.error('GET /api/tasks failed:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

initSocketHandlers(io);

const PORT = process.env.PORT || 3001;

const start = async () => {
  await initDB();
  initAlertService(io);
  initLogJob();
  httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
