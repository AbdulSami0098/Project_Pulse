import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'project_pulse',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

export const initDB = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      slug VARCHAR(255),
      description TEXT,
      github_repo VARCHAR(255),
      jira_url VARCHAR(255),
      slack_webhook VARCHAR(255),
      teams_webhook VARCHAR(255),
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      source VARCHAR(100) NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id SERIAL PRIMARY KEY,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
      message TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id);
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
    -- Composite indexes for hot read paths:
    --   getEventsByProject orders by created_at within a project
    --   getProjectById integration check filters by (project_id, source, created_at)
    CREATE INDEX IF NOT EXISTS idx_events_project_created
      ON events(project_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_project_source_created
      ON events(project_id, source, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_alerts_project_id ON alerts(project_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_alerts_project_created
      ON alerts(project_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'error')),
      source VARCHAR(100) NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_logs_project_id ON logs(project_id);
    CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_logs_project_created ON logs(project_id, created_at DESC);
  `);

  // Migrations for existing installations
  await pool.query(`
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_repo VARCHAR(255);
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS jira_url VARCHAR(255);
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS slack_webhook VARCHAR(255);
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS teams_webhook VARCHAR(255);
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug) WHERE slug IS NOT NULL;
  `);

  console.log('Database schema initialized');
};

export default pool;
