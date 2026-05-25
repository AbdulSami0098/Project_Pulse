import { Server, Socket } from 'socket.io';
import { getAlertsByProject } from '../models/Alert';
import { getEventsByProject } from '../models/Event';
import { getTasksFromEventsByProject } from '../models/Task';
import { runAlertCycleForProject, runAlertCycle } from '../services/alertService';

export const initSocketHandlers = (io: Server): void => {
  io.on('connection', async (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Client tells us which project they're viewing
    socket.on('join_project', async ({ project_id }: { project_id: number }) => {
      // Leave any previous project rooms
      for (const room of socket.rooms) {
        if (room !== socket.id && room.startsWith('project:')) {
          socket.leave(room);
        }
      }

      socket.join(`project:${project_id}`);
      console.log(`Socket ${socket.id} joined project:${project_id}`);

      try {
        const [alerts, events, tasks] = await Promise.all([
          getAlertsByProject(project_id, 20),
          getEventsByProject(project_id, 50),
          getTasksFromEventsByProject(project_id),
        ]);
        socket.emit('initial_data', { alerts, events, tasks });
      } catch (err) {
        console.error(`Error sending initial data for project ${project_id}:`, err);
      }
    });

    socket.on('request_analysis', async ({ project_id }: { project_id?: number } = {}) => {
      try {
        if (project_id) {
          await runAlertCycleForProject(project_id);
        } else {
          await runAlertCycle();
        }
      } catch (err) {
        console.error('Manual analysis error:', err);
        socket.emit('analysis_error', { message: 'Analysis failed. Check server logs.' });
      }
    });

    // Note: we deliberately do NOT emit any global `initial_data` on connect.
    // Clients must call `join_project` first; that handler emits scoped data.
    // The previous global emit caused a race where an empty array would arrive
    // before `join_project` completed and wipe the HTTP-fetched initial state.

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};
