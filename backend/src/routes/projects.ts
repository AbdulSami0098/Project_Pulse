import { Router, Request, Response } from 'express';
import { createProject, getAllProjects, getProjectById, updateProject, deleteProject } from '../models/Project';
import { getAlertsByProject } from '../models/Alert';
import { getEventsByProject } from '../models/Event';
import { getTasksFromEventsByProject, getAlertsSummaryByProject } from '../models/Task';
import pool from '../db/postgres';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const projects = await getAllProjects();
    res.json(projects);
  } catch {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const project = await createProject(req.body as Parameters<typeof createProject>[0]);
    res.status(201).json(project);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('unique') || msg.includes('duplicate')) {
      res.status(409).json({ error: 'A project with that name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid project id' }); return; }

    const project = await getProjectById(id);
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [githubRes, jiraRes, slackRes] = await Promise.all([
      pool.query<{ exists: boolean }>(
        `SELECT EXISTS(SELECT 1 FROM events WHERE project_id=$1 AND source='github' AND created_at > $2) AS exists`,
        [id, sevenDaysAgo]
      ),
      pool.query<{ exists: boolean }>(
        `SELECT EXISTS(SELECT 1 FROM events WHERE project_id=$1 AND source='jira' AND created_at > $2) AS exists`,
        [id, sevenDaysAgo]
      ),
      pool.query<{ exists: boolean }>(
        `SELECT EXISTS(SELECT 1 FROM events WHERE project_id=$1 AND source='slack' AND created_at > $2) AS exists`,
        [id, sevenDaysAgo]
      ),
    ]);

    res.json({
      ...project,
      integrations: {
        github: githubRes.rows[0]?.exists ?? false,
        jira: jiraRes.rows[0]?.exists ?? false,
        slack: slackRes.rows[0]?.exists ?? false,
        teams: !!project.teams_webhook,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid project id' }); return; }

    const project = await updateProject(id, req.body as Parameters<typeof updateProject>[1]);
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
    res.json(project);
  } catch {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid project id' }); return; }
    await deleteProject(id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

router.get('/:id/events', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid project id' }); return; }
    const events = await getEventsByProject(id, 50);
    res.json(events);
  } catch {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.get('/:id/alerts', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid project id' }); return; }
    const alerts = await getAlertsByProject(id, 20);
    res.json(alerts);
  } catch {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.get('/:id/alerts/summary', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid project id' }); return; }
    const summary = await getAlertsSummaryByProject(id);
    res.json(summary);
  } catch {
    res.status(500).json({ error: 'Failed to fetch alerts summary' });
  }
});

router.get('/:id/tasks', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid project id' }); return; }
    const tasks = await getTasksFromEventsByProject(id);
    res.json(tasks);
  } catch {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

export default router;
