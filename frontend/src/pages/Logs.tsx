import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Info, CheckCircle, RefreshCw } from 'lucide-react';
import { API_URL, API_HEADERS } from '../lib/env';
import { useProjectContext } from '../contexts/ProjectContext';

interface LogEntry {
  id: number;
  project_id: number;
  level: 'info' | 'warning' | 'error';
  source: string;
  message: string;
  details?: string;
  created_at: string;
}

const LEVEL_CFG = {
  error: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    badge: 'bg-red-500/20 text-red-400',
    label: 'ERROR',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    badge: 'bg-yellow-500/20 text-yellow-400',
    label: 'WARNING',
  },
  info: {
    icon: CheckCircle,
    color: 'text-green-400',
    bg: 'bg-green-500/5',
    border: 'border-green-500/10',
    badge: 'bg-green-500/20 text-green-400',
    label: 'INFO',
  },
} as const;

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export const Logs = () => {
  const { selectedProject } = useProjectContext();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!selectedProject) return;
    try {
      const res = await fetch(`${API_URL}/api/projects/${selectedProject.id}/logs`, { headers: API_HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: LogEntry[] = await res.json();
      setLogs(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    setLoading(true);
    setLogs([]);
    fetchLogs();
    const interval = setInterval(fetchLogs, 30_000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white font-semibold text-xl">Logs</h2>
            <p className="text-gray-500 text-sm mt-1">
              Risk indicator job failures and hourly health checks
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-gray-600 text-xs">
                Updated {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchLogs}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors border border-gray-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
            Loading logs…
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-gray-900 rounded-xl border border-gray-800 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center mb-3">
              <Info className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm">No logs yet</p>
            <p className="text-gray-600 text-xs mt-1">
              The hourly job will log results here once it runs
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const cfg = LEVEL_CFG[log.level];
              const Icon = cfg.icon;
              return (
                <div
                  key={log.id}
                  className={`${cfg.bg} border ${cfg.border} rounded-lg p-4`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-4 h-4 ${cfg.color} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                        <span className="text-gray-500 text-xs font-mono">{log.source}</span>
                        <span className="text-gray-600 text-xs ml-auto">
                          {formatTime(log.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-200 text-sm">{log.message}</p>
                      {log.details && (
                        <p className="text-gray-500 text-xs mt-1.5 font-mono break-all">
                          {log.details}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
