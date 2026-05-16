import { createEvent } from '../models/Event';
import { getOrCreateProject } from '../models/Project';

export const handlePushEvent = async (payload: Record<string, unknown>) => {
  const repo = (payload.repository as Record<string, unknown>)?.name as string ?? 'unknown';
  const projectId = await getOrCreateProject(repo);
  const pusher = payload.pusher as Record<string, unknown> | undefined;
  const commits = payload.commits as unknown[] | undefined;
  const headCommit = payload.head_commit as Record<string, unknown> | undefined;

  return createEvent(projectId, 'push', 'github', {
    ref: payload.ref,
    commits: commits?.length ?? 0,
    pusher: pusher?.name,
    repository: repo,
    head_commit_message: headCommit?.message,
  });
};

export const handlePullRequestEvent = async (payload: Record<string, unknown>) => {
  const repo = (payload.repository as Record<string, unknown>)?.name as string ?? 'unknown';
  const projectId = await getOrCreateProject(repo);
  const pr = payload.pull_request as Record<string, unknown> | undefined;
  const user = pr?.user as Record<string, unknown> | undefined;

  return createEvent(projectId, 'pull_request', 'github', {
    action: payload.action,
    number: pr?.number,
    title: pr?.title,
    state: pr?.state,
    user: user?.login,
    repository: repo,
    draft: pr?.draft,
    merged: pr?.merged,
  });
};

export const handleBranchEvent = async (
  payload: Record<string, unknown>,
  eventType: string
) => {
  const repo = (payload.repository as Record<string, unknown>)?.name as string ?? 'unknown';
  const projectId = await getOrCreateProject(repo);
  const sender = payload.sender as Record<string, unknown> | undefined;

  return createEvent(
    projectId,
    eventType === 'create' ? 'branch_created' : 'branch_deleted',
    'github',
    {
      ref: payload.ref,
      ref_type: payload.ref_type,
      repository: repo,
      sender: sender?.login,
    }
  );
};
