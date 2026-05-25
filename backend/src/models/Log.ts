import pool from '../db/postgres';

export interface Log {
  id: number;
  project_id: number;
  level: 'info' | 'warning' | 'error';
  source: string;
  message: string;
  details?: string;
  created_at: string;
}

export const createLog = async (
  projectId: number,
  level: Log['level'],
  source: string,
  message: string,
  details?: string,
): Promise<Log> => {
  const result = await pool.query<Log>(
    `INSERT INTO logs (project_id, level, source, message, details)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [projectId, level, source, message, details ?? null],
  );
  return result.rows[0];
};

export const getLogsByProject = async (projectId: number, limit = 100): Promise<Log[]> => {
  const result = await pool.query<Log>(
    `SELECT * FROM logs WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [projectId, limit],
  );
  return result.rows;
};
