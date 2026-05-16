export interface Project {
  id: number;
  name: string;
  created_at: string;
}

export interface Event {
  id: number;
  project_id: number;
  type: string;
  source: 'github' | 'jira' | 'slack';
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Alert {
  id: number;
  project_id: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'in_progress' | 'blocked' | 'in_review' | 'done';
  assignee?: string;
  project_id: number;
}

export interface AlertsSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
}

export interface AnalysisUpdate {
  summary: string;
  recommendations: string[];
  timestamp: string;
}

export interface InitialData {
  alerts: Alert[];
  events: Event[];
  tasks: Task[];
}

export interface SocketEvents {
  initial_data: InitialData;
  new_alert: Alert;
  alerts_refresh: Alert[];
  analysis_update: AnalysisUpdate;
  analysis_error: { message: string };
  tasks_update: Task[];
}
