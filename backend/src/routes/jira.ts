import { Router, Request, Response } from 'express';
import { handleIssueEvent } from '../services/jiraService';

const router = Router();

router.post('/webhook', async (req: Request, res: Response) => {
  const payload = req.body as Record<string, unknown>;

  try {
    if (payload.issue) {
      await handleIssueEvent(payload);
    } else {
      console.log('Jira webhook received with no issue payload:', payload.webhookEvent);
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Jira webhook error:', err);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

export default router;
