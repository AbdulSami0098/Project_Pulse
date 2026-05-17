import pool from '../db/postgres';

export interface Task {
  id: string;
  title: string;
  status: 'in_progress' | 'blocked' | 'in_review' | 'done';
  assignee?: string;
  project_id: number;
}

export interface AlertsSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
}

const STATUS_MAP: Record<string, Task['status']> = {
  'in progress': 'in_progress',
  'in-progress': 'in_progress',
  'to do': 'in_progress',
  'todo': 'in_progress',
  'open': 'in_progress',
  'new': 'in_progress',
  'blocked': 'blocked',
  'impediment': 'blocked',
  'on hold': 'blocked',
  'in review': 'in_review',
  'in-review': 'in_review',
  'code review': 'in_review',
  'review': 'in_review',
  'pull request': 'in_review',
  'done': 'done',
  'closed': 'done',
  'resolved': 'done',
  'complete': 'done',
  'completed': 'done',
};

export const MOCK_TASKS: Task[] = [
  { id: 'mock-1', title: 'Implement auth middleware', status: 'in_progress', assignee: 'Alice', project_id: 1 },
  { id: 'mock-2', title: 'Fix payment gateway bug', status: 'blocked', assignee: 'Bob', project_id: 1 },
  { id: 'mock-3', title: 'Code review: API endpoints', status: 'in_review', assignee: 'Carol', project_id: 1 },
  { id: 'mock-4', title: 'Database migration v2', status: 'done', assignee: 'Dave', project_id: 1 },
  { id: 'mock-5', title: 'Update CI/CD pipeline', status: 'in_progress', assignee: 'Eve', project_id: 1 },
  { id: 'mock-6', title: 'Write unit tests for core', status: 'in_review', assignee: 'Frank', project_id: 1 },
  { id: 'mock-7', title: 'Performance optimization', status: 'blocked', assignee: 'Grace', project_id: 1 },
  { id: 'mock-8', title: 'Deploy to staging env', status: 'done', assignee: 'Henry', project_id: 1 },
];

function rowsToTasks(rows: { id: number; project_id: number; payload: Record<string, string> }[]): Task[] {
  return rows.map((row) => {
    const rawStatus = (row.payload.status ?? '').toLowerCase();
    return {
      id: String(row.id),
      title: row.payload.summary ?? row.payload.issue_key,
      status: STATUS_MAP[rawStatus] ?? 'in_progress',
      assignee: row.payload.assignee,
      project_id: row.project_id,
    };
  });
}

export const getTasksFromEvents = async (): Promise<Task[]> => {
  const result = await pool.query<{
    id: number;
    project_id: number;
    payload: Record<string, string>;
  }>(`
    SELECT DISTINCT ON (payload->>'issue_key')
      id, project_id, payload
    FROM events
    WHERE type = 'jira_issue'
      AND payload->>'issue_key' IS NOT NULL
    ORDER BY payload->>'issue_key', created_at DESC
  `);

  if (result.rows.length === 0) return MOCK_TASKS;
  return rowsToTasks(result.rows);
};

export const getTasksFromEventsByProject = async (projectId: number): Promise<Task[]> => {
  const result = await pool.query<{
    id: number;
    project_id: number;
    payload: Record<string, string>;
  }>(`
    SELECT DISTINCT ON (payload->>'issue_key')
      id, project_id, payload
    FROM events
    WHERE type = 'jira_issue'
      AND project_id = $1
      AND payload->>'issue_key' IS NOT NULL
    ORDER BY payload->>'issue_key', created_at DESC
  `, [projectId]);

  if (result.rows.length === 0) {
    return MOCK_TASKS.map(t => ({ ...t, project_id: projectId }));
  }
  return rowsToTasks(result.rows);
};

export const getAlertsSummary = async (): Promise<AlertsSummary> => {
  const result = await pool.query<{ severity: string; count: string }>(`
    SELECT severity, COUNT(*)::int AS count
    FROM alerts
    GROUP BY severity
  `);

  const summary: AlertsSummary = { total: 0, high: 0, medium: 0, low: 0 };
  for (const row of result.rows) {
    const count = row.count as unknown as number;
    if (row.severity === 'high' || row.severity === 'medium' || row.severity === 'low') {
      summary[row.severity] = count;
    }
    summary.total += count;
  }
  return summary;
};

export const getAlertsSummaryByProject = async (projectId: number): Promise<AlertsSummary> => {
  const result = await pool.query<{ severity: string; count: string }>(`
    SELECT severity, COUNT(*)::int AS count
    FROM alerts
    WHERE project_id = $1
    GROUP BY severity
  `, [projectId]);

  const summary: AlertsSummary = { total: 0, high: 0, medium: 0, low: 0 };
  for (const row of result.rows) {
    const count = row.count as unknown as number;
    if (row.severity === 'high' || row.severity === 'medium' || row.severity === 'low') {
      summary[row.severity] = count;
    }
    summary.total += count;
  }
  return summary;
};
