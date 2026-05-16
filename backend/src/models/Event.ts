import pool from '../db/postgres';

export interface Event {
  id: number;
  project_id: number;
  type: string;
  source: string;
  payload: Record<string, unknown>;
  created_at: Date;
}

export const createEvent = async (
  project_id: number,
  type: string,
  source: string,
  payload: Record<string, unknown>
): Promise<Event> => {
  const result = await pool.query<Event>(
    'INSERT INTO events (project_id, type, source, payload) VALUES ($1, $2, $3, $4) RETURNING *',
    [project_id, type, source, JSON.stringify(payload)]
  );
  return result.rows[0];
};

export const getRecentEvents = async (limit = 50): Promise<Event[]> => {
  const result = await pool.query<Event>(
    'SELECT * FROM events ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return result.rows;
};

export const getEventsByProject = async (project_id: number, limit = 50): Promise<Event[]> => {
  const result = await pool.query<Event>(
    'SELECT * FROM events WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2',
    [project_id, limit]
  );
  return result.rows;
};
