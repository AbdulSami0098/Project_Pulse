import { Server, Socket } from 'socket.io';
import { getRecentAlerts } from '../models/Alert';
import { getRecentEvents } from '../models/Event';
import { getTasksFromEvents } from '../models/Task';
import { runAlertCycle } from '../services/alertService';

export const initSocketHandlers = (io: Server): void => {
  io.on('connection', async (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    try {
      const [alerts, events, tasks] = await Promise.all([
        getRecentAlerts(20),
        getRecentEvents(50),
        getTasksFromEvents(),
      ]);
      socket.emit('initial_data', { alerts, events, tasks });
    } catch (err) {
      console.error('Error sending initial data:', err);
    }

    socket.on('request_analysis', async () => {
      try {
        await runAlertCycle();
      } catch (err) {
        console.error('Manual analysis error:', err);
        socket.emit('analysis_error', { message: 'Analysis failed. Check server logs.' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};
