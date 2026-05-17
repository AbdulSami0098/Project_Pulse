import pool from '../db/postgres';

export interface Project {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  github_repo: string | null;
  jira_url: string | null;
  slack_webhook: string | null;
  teams_webhook: string | null;
  status: 'active' | 'inactive';
  created_at: Date;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  github_repo?: string;
  jira_url?: string;
  slack_webhook?: string;
  teams_webhook?: string;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const params: (string | number)[] = [candidate];
    let query = 'SELECT id FROM projects WHERE slug = $1';
    if (excludeId != null) {
      query += ' AND id != $2';
      params.push(excludeId);
    }
    const res = await pool.query<{ id: number }>(query, params);
    if (res.rows.length === 0) return candidate;
    attempt++;
  }
}

export const createProject = async (input: CreateProjectInput): Promise<Project> => {
  const slug = await uniqueSlug(toSlug(input.name));
  const result = await pool.query<Project>(
    `INSERT INTO projects (name, slug, description, github_repo, jira_url, slack_webhook, teams_webhook)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [input.name, slug, input.description ?? null, input.github_repo ?? null,
     input.jira_url ?? null, input.slack_webhook ?? null, input.teams_webhook ?? null]
  );
  return result.rows[0];
};

export const getAllProjects = async (): Promise<Project[]> => {
  const result = await pool.query<Project>('SELECT * FROM projects ORDER BY created_at DESC');
  return result.rows;
};

export const getProjectById = async (id: number): Promise<Project | null> => {
  const result = await pool.query<Project>('SELECT * FROM projects WHERE id = $1', [id]);
  return result.rows[0] ?? null;
};

export const updateProject = async (
  id: number,
  input: Partial<CreateProjectInput & { status: 'active' | 'inactive' }>
): Promise<Project | null> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.name !== undefined) { fields.push(`name = $${idx++}`); values.push(input.name); }
  if (input.description !== undefined) { fields.push(`description = $${idx++}`); values.push(input.description); }
  if (input.github_repo !== undefined) { fields.push(`github_repo = $${idx++}`); values.push(input.github_repo); }
  if (input.jira_url !== undefined) { fields.push(`jira_url = $${idx++}`); values.push(input.jira_url); }
  if (input.slack_webhook !== undefined) { fields.push(`slack_webhook = $${idx++}`); values.push(input.slack_webhook); }
  if (input.teams_webhook !== undefined) { fields.push(`teams_webhook = $${idx++}`); values.push(input.teams_webhook); }
  if (input.status !== undefined) { fields.push(`status = $${idx++}`); values.push(input.status); }

  if (input.name) {
    const slug = await uniqueSlug(toSlug(input.name), id);
    fields.push(`slug = $${idx++}`);
    values.push(slug);
  }

  if (fields.length === 0) return getProjectById(id);

  values.push(id);
  const result = await pool.query<Project>(
    `UPDATE projects SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
};

export const deleteProject = async (id: number): Promise<void> => {
  await pool.query('DELETE FROM projects WHERE id = $1', [id]);
};

export const getOrCreateProject = async (name: string): Promise<number> => {
  const existing = await pool.query<{ id: number }>(
    'SELECT id FROM projects WHERE name = $1',
    [name]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const slug = await uniqueSlug(toSlug(name));
  const created = await pool.query<{ id: number }>(
    `INSERT INTO projects (name, slug) VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [name, slug]
  );
  return created.rows[0].id;
};

export const getProjects = getAllProjects;
