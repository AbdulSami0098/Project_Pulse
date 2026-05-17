import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Alert, Event, Task, AlertsSummary, AnalysisUpdate } from '../types';

const API_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

const EMPTY_SUMMARY: AlertsSummary = { total: 0, high: 0, medium: 0, low: 0 };

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const useSocket = (projectId: number | null) => {
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisUpdate | null>(null);
  const [alertsSummary, setAlertsSummary] = useState<AlertsSummary>(EMPTY_SUMMARY);
  const socketRef = useRef<Socket | null>(null);
  const currentProjectRef = useRef<number | null>(null);

  useEffect(() => {
    if (projectId === null) {
      setAlerts([]);
      setEvents([]);
      setTasks([]);
      setTasksLoading(false);
      setAlertsSummary(EMPTY_SUMMARY);
      setAnalysis(null);
      return;
    }

    setTasksLoading(true);

    apiFetch<Alert[]>(`/api/projects/${projectId}/alerts`)
      .then(setAlerts)
      .catch(() => {});

    apiFetch<Task[]>(`/api/projects/${projectId}/tasks`)
      .then((data) => { setTasks(data); setTasksLoading(false); })
      .catch(() => { setTasksLoading(false); });

    apiFetch<AlertsSummary>(`/api/projects/${projectId}/alerts/summary`)
      .then(setAlertsSummary)
      .catch(() => {});

    apiFetch<Event[]>(`/api/projects/${projectId}/events`)
      .then(setEvents)
      .catch(() => {});

    let socket = socketRef.current;

    if (!socket) {
      socket = io(API_URL, { transports: ['websocket', 'polling'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        if (currentProjectRef.current !== null) {
          socket!.emit('join_project', { project_id: currentProjectRef.current });
        }
      });

      socket.on('disconnect', () => setConnected(false));

      socket.on('initial_data', ({ alerts: a, events: e, tasks: t }: {
        alerts: Alert[]; events: Event[]; tasks: Task[];
      }) => {
        setAlerts(a);
        setEvents(e);
        if (t?.length) { setTasks(t); setTasksLoading(false); }
      });

      socket.on('new_alert', (alert: Alert) => {
        setAlerts((prev) => [alert, ...prev].slice(0, 100));
        setAlertsSummary((prev) => ({
          ...prev,
          total: prev.total + 1,
          [alert.severity]: prev[alert.severity] + 1,
        }));
      });

      socket.on('alerts_refresh', (fresh: Alert[]) => {
        setAlerts(fresh);
        const next = { ...EMPTY_SUMMARY };
        for (const a of fresh) {
          next[a.severity]++;
          next.total++;
        }
        setAlertsSummary(next);
      });

      socket.on('analysis_update', (update: AnalysisUpdate) => {
        setAnalysis(update);
      });

      socket.on('tasks_update', (updated: Task[]) => {
        setTasks(updated);
      });
    }

    // Switch to this project's room
    currentProjectRef.current = projectId;
    if (socket.connected) {
      socket.emit('join_project', { project_id: projectId });
    }

    return () => {
      // Don't disconnect the socket on project change — just leave old room implicitly
      // (server handles room switching in join_project handler)
    };
  }, [projectId]);

  // Disconnect socket on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const requestAnalysis = useCallback(() => {
    socketRef.current?.emit('request_analysis', { project_id: currentProjectRef.current });
  }, []);

  return { connected, alerts, events, tasks, tasksLoading, analysis, alertsSummary, requestAnalysis };
};
