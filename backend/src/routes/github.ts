import { Router, Request, Response } from 'express';
import { handlePushEvent, handlePullRequestEvent, handleBranchEvent } from '../services/githubService';

const router = Router();

router.post('/webhook', async (req: Request, res: Response) => {
  const event = req.headers['x-github-event'] as string | undefined;
  const payload = req.body as Record<string, unknown>;

  try {
    switch (event) {
      case 'push':
        await handlePushEvent(payload);
        break;
      case 'pull_request':
        await handlePullRequestEvent(payload);
        break;
      case 'create':
      case 'delete':
        await handleBranchEvent(payload, event);
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

export default router;
