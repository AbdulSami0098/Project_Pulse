import pool from '../db/postgres';

export interface Project {
  id: number;
  name: string;
  created_at: Date;
}

export const getOrCreateProject = async (name: string): Promise<number> => {
  const existing = await pool.query<{ id: number }>(
    'SELECT id FROM projects WHERE name = $1',
    [name]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const created = await pool.query<{ id: number }>(
    'INSERT INTO projects (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
    [name]
  );
  return created.rows[0].id;
};

export const getProjects = async (): Promise<Project[]> => {
  const result = await pool.query<Project>('SELECT * FROM projects ORDER BY created_at DESC');
  return result.rows;
};
