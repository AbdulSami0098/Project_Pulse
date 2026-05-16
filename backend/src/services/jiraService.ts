import { createEvent } from '../models/Event';
import { getOrCreateProject } from '../models/Project';
import { getTasksFromEvents } from '../models/Task';
import { broadcastEvent } from './alertService';

export const handleIssueEvent = async (payload: Record<string, unknown>) => {
  const issue = payload.issue as Record<string, unknown> | undefined;
  const fields = issue?.fields as Record<string, unknown> | undefined;
  const project = fields?.project as Record<string, unknown> | undefined;
  const status = fields?.status as Record<string, unknown> | undefined;
  const assignee = fields?.assignee as Record<string, unknown> | undefined;

  const projectKey = (project?.key as string) ?? 'UNKNOWN';
  const projectId = await getOrCreateProject(projectKey);

  const changelog = payload.changelog as Record<string, unknown> | undefined;
  const changelogItems = changelog?.items as Record<string, unknown>[] | undefined;

  const event = await createEvent(projectId, 'jira_issue', 'jira', {
    issue_key: issue?.key,
    summary: fields?.summary,
    status: status?.name,
    assignee: assignee?.displayName,
    event_type: payload.webhookEvent,
    changelog: changelogItems?.map((item) => ({
      field: item.field,
      from: item.fromString,
      to: item.toString,
    })),
  });

  // Broadcast refreshed task list to all connected clients
  const tasks = await getTasksFromEvents();
  broadcastEvent('tasks_update', tasks);

  return event;
};
