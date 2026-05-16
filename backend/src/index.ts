import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import { initDB } from './db/postgres';
import githubRouter from './routes/github';
import jiraRouter from './routes/jira';
import slackRouter from './routes/slack';
import { initSocketHandlers } from './socket/socketHandler';
import { initAlertService } from './services/alertService';
import { getRecentAlerts } from './models/Alert';
import { getRecentEvents } from './models/Event';
import { getTasksFromEvents, getAlertsSummary } from './models/Task';

const app = express();
const httpServer = createServer(app);

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: { origin: frontendUrl, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: frontendUrl }));
app.use(express.json());

app.use('/api/github', githubRouter);
app.use('/api/jira', jiraRouter);
app.use('/api/slack', slackRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/alerts', async (_req, res) => {
  try {
    const alerts = await getRecentAlerts(20);
    res.json(alerts);
  } catch {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

app.get('/api/events', async (_req, res) => {
  try {
    const events = await getRecentEvents(50);
    res.json(events);
  } catch {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.get('/api/projects/tasks', async (_req, res) => {
  try {
    const tasks = await getTasksFromEvents();
    res.json(tasks);
  } catch {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.get('/api/alerts/summary', async (_req, res) => {
  try {
    const summary = await getAlertsSummary();
    res.json(summary);
  } catch {
    res.status(500).json({ error: 'Failed to fetch alerts summary' });
  }
});

initSocketHandlers(io);

const PORT = process.env.PORT || 3001;

const start = async () => {
  await initDB();
  initAlertService(io);
  httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
