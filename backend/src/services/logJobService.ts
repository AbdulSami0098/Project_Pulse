import { getAllProjects } from '../models/Project';
import { getAlertsByProject } from '../models/Alert';
import { createLog } from '../models/Log';

const SOURCE = 'risk-indicator-fetch';

async function runLogJobForProject(projectId: number): Promise<void> {
  try {
    await getAlertsByProject(projectId, 1);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await createLog(projectId, 'error', SOURCE, 'Risk indicator fetch failed', message);
    console.error(`[LogJob] project ${projectId} risk indicator fetch failed:`, err);
  }
}

async function runLogJob(): Promise<void> {
  try {
    const projects = await getAllProjects();
    const active = projects.filter((p) => p.status === 'active');
    await Promise.allSettled(active.map((p) => runLogJobForProject(p.id)));
    console.log(`[LogJob] hourly check complete — ${active.length} project(s) checked`);
  } catch (err) {
    console.error('[LogJob] hourly job failed to load projects:', err);
  }
}

export const initLogJob = (): void => {
  // Run once immediately on startup, then every hour
  runLogJob();
  setInterval(runLogJob, 60 * 60 * 1000);
  console.log('Log job initialized — risk indicator checks run every hour');
};
