import { Server } from 'socket.io';
import { getRecentEvents } from '../models/Event';
import { createAlert, getRecentAlerts } from '../models/Alert';
import { analyzeEvents } from './aiService';

let io: Server | null = null;

export const initAlertService = (socketServer: Server): void => {
  io = socketServer;
  setInterval(runAlertCycle, 5 * 60 * 1000);
  console.log('Alert service initialized — analysis runs every 5 minutes');
};

export const broadcastEvent = (event: string, data: unknown): void => {
  io?.emit(event, data);
};

export const runAlertCycle = async (): Promise<void> => {
  if (!io) return;

  try {
    const events = await getRecentEvents(50);
    if (events.length === 0) return;

    const analysis = await analyzeEvents(events);
    const projectId = events[0].project_id;

    for (const risk of analysis.risks) {
      const fallback = analysis.recommendations[0] ?? 'Review and address this risk promptly.';
      const alert = await createAlert(projectId, risk.severity, risk.description, fallback);
      io.emit('new_alert', alert);
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
  }
};
