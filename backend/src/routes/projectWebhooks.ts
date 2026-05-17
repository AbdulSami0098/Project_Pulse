import { Router, Request, Response } from 'express';
import { getProjectById } from '../models/Project';
import { createEvent } from '../models/Event';
import { handlePushEvent, handlePullRequestEvent, handleBranchEvent } from '../services/githubService';
import { handleIssueEvent } from '../services/jiraService';

const router = Router({ mergeParams: true });

async function resolveProject(req: Request, res: Response): Promise<number | null> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid project id' });
    return null;
  }
  const project = await getProjectById(id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return null;
  }
  return id;
}

router.post('/github', async (req: Request, res: Response) => {
  const projectId = await resolveProject(req, res);
  if (projectId === null) return;

  const event = req.headers['x-github-event'] as string | undefined;
  const payload = req.body as Record<string, unknown>;

  try {
    switch (event) {
      case 'push':
        await handlePushEvent(payload, projectId);
        break;
      case 'pull_request':
        await handlePullRequestEvent(payload, projectId);
        break;
      case 'create':
      case 'delete':
        await handleBranchEvent(payload, event, projectId);
        break;
      default:
        console.log(`Unhandled GitHub event: ${event}`);
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('GitHub webhook error:', err);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

router.post('/jira', async (req: Request, res: Response) => {
  const projectId = await resolveProject(req, res);
  if (projectId === null) return;

  const payload = req.body as Record<string, unknown>;

  try {
    if (payload.issue) {
      await handleIssueEvent(payload, projectId);
    } else {
      console.log('Jira webhook received with no issue payload:', payload.webhookEvent);
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Jira webhook error:', err);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

router.post('/slack', async (req: Request, res: Response) => {
  const payload = req.body as Record<string, unknown>;

  if (payload.type === 'url_verification') {
    res.json({ challenge: payload.challenge });
    return;
  }

  const projectId = await resolveProject(req, res);
  if (projectId === null) return;

  try {
    const event = payload.event as Record<string, unknown> | undefined;
    if (event) {
      await createEvent(projectId, `slack_${event.type ?? 'message'}`, 'slack', {
        text: event.text,
        user: event.user,
        channel: event.channel,
        timestamp: event.ts,
        team_id: payload.team_id,
      });
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Slack webhook error:', err);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

router.post('/teams', async (req: Request, res: Response) => {
  const projectId = await resolveProject(req, res);
  if (projectId === null) return;

  const payload = req.body as Record<string, unknown>;

  try {
    await createEvent(projectId, 'teams_message', 'teams', {
      type: payload.type,
      text: payload.text,
      from: payload.from,
      timestamp: new Date().toISOString(),
    });
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Teams webhook error:', err);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

export default router;
