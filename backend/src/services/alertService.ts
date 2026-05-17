import { Server } from 'socket.io';
import { getEventsByProject, getRecentEvents } from '../models/Event';
import { createAlert, getAlertsByProject, getRecentAlerts } from '../models/Alert';
import { getAllProjects, getProjectById } from '../models/Project';
import { analyzeEvents } from './aiService';
import { sendTeamsAlert } from './teamsService';

let io: Server | null = null;

export const initAlertService = (socketServer: Server): void => {
  io = socketServer;
  setInterval(runAllProjectAlertCycles, 5 * 60 * 1000);
  console.log('Alert service initialized — analysis runs every 5 minutes');
};

export const broadcastEvent = (event: string, data: unknown): void => {
  io?.emit(event, data);
};

export const broadcastToProject = (projectId: number, event: string, data: unknown): void => {
  io?.to(`project:${projectId}`).emit(event, data);
};

export const runAllProjectAlertCycles = async (): Promise<void> => {
  if (!io) return;
  try {
    const projects = await getAllProjects();
    for (const project of projects) {
      if (project.status === 'active') {
        await runAlertCycleForProject(project.id);
      }
    }
  } catch (err) {
    console.error('Alert cycle (all projects) failed:', err);
  }
};

export const runAlertCycleForProject = async (projectId: number): Promise<void> => {
  if (!io) return;

  try {
    const events = await getEventsByProject(projectId, 50);
    if (events.length === 0) return;

    const project = await getProjectById(projectId);

    const analysis = await analyzeEvents(events);

    for (const risk of analysis.risks) {
      const fallback = analysis.recommendations[0] ?? 'Review and address this risk promptly.';
      const alert = await createAlert(projectId, risk.severity, risk.description, fallback);

      io.to(`project:${projectId}`).emit('new_alert', alert);

      if (project?.teams_webhook) {
        sendTeamsAlert(project.teams_webhook, alert).catch((err) =>
          console.error(`Teams notification error for project ${projectId}:`, err)
        );
      }
    }

    io.to(`project:${projectId}`).emit('analysis_update', {
      summary: analysis.summary,
      recommendations: analysis.recommendations,
      timestamp: new Date().toISOString(),
    });

    const freshAlerts = await getAlertsByProject(projectId, 20);
    io.to(`project:${projectId}`).emit('alerts_refresh', freshAlerts);

    console.log(`Alert cycle complete for project ${projectId} — ${analysis.risks.length} risks detected`);
  } catch (err) {
    console.error(`Alert cycle failed for project ${projectId}:`, err);
  }
};

// Legacy: runs a single cycle across all events (used when no project is specified)
export const runAlertCycle = async (): Promise<void> => {
  if (!io) return;

  try {
    const events = await getRecentEvents(50);
    if (events.length === 0) return;

    const analysis = await analyzeEvents(events);
    const projectId = events[0].project_id;
    const project = await getProjectById(projectId);

    for (const risk of analysis.risks) {
      const fallback = analysis.recommendations[0] ?? 'Review and address this risk promptly.';
      const alert = await createAlert(projectId, risk.severity, risk.description, fallback);

      io.to(`project:${projectId}`).emit('new_alert', alert);
      io.emit('new_alert', alert); // also broadcast globally for clients not in a room

      if (project?.teams_webhook) {
        sendTeamsAlert(project.teams_webhook, alert).catch((err) =>
          console.error('Teams notification error:', err)
        );
      }
    }

    io.emit('analysis_update', {
      summary: analysis.summary,
      recommendations: analysis.recommendations,
      timestamp: new Date().toISOString(),
    });

    const freshAlerts = await getRecentAlerts(20);
    io.emit('alerts_refresh', freshAlerts);

    console.log(`Alert cycle complete — ${analysis.risks.length} risks detected`);
  } catch (err) {
    console.error('Alert cycle failed:', err);
    io.emit('analysis_error', { message: 'Analysis failed. Check server logs.' });
  }
};
