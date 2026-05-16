import pool from '../db/postgres';

export interface Alert {
  id: number;
  project_id: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation: string;
  created_at: Date;
}

export const createAlert = async (
  project_id: number,
  severity: string,
  message: string,
  recommendation: string
): Promise<Alert> => {
  const result = await pool.query<Alert>(
    'INSERT INTO alerts (project_id, severity, message, recommendation) VALUES ($1, $2, $3, $4) RETURNING *',
    [project_id, severity, message, recommendation]
  );
  return result.rows[0];
};

export const getRecentAlerts = async (limit = 20): Promise<Alert[]> => {
  const result = await pool.query<Alert>(
    'SELECT * FROM alerts ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return result.rows;
};

export const getAlertsByProject = async (project_id: number, limit = 20): Promise<Alert[]> => {
  const result = await pool.query<Alert>(
    'SELECT * FROM alerts WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2',
    [project_id, limit]
  );
  return result.rows;
};
