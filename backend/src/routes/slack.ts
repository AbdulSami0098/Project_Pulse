import { Router, Request, Response } from 'express';
import { createEvent } from '../models/Event';
import { getOrCreateProject } from '../models/Project';

const router = Router();

router.post('/webhook', async (req: Request, res: Response) => {
  const payload = req.body as Record<string, unknown>;

  if (payload.type === 'url_verification') {
    res.json({ challenge: payload.challenge });
    return;
  }

  try {
    const event = payload.event as Record<string, unknown> | undefined;
    if (event) {
      const projectId = await getOrCreateProject('slack-default');
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

export default router;
