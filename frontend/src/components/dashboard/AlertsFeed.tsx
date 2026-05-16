import { AlertTriangle, AlertCircle, Info, Clock } from 'lucide-react';
import type { Alert } from '../../types';

const SEVERITY = {
  high: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/25',
    badge: 'bg-red-500/20 text-red-400',
  },
  medium: {
    icon: AlertCircle,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/25',
    badge: 'bg-yellow-500/20 text-yellow-400',
  },
  low: {
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/25',
    badge: 'bg-blue-500/20 text-blue-400',
  },
} as const;

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

interface AlertsFeedProps {
  alerts: Alert[];
}

export const AlertsFeed = ({ alerts }: AlertsFeedProps) => (
  <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 flex flex-col h-full">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-white font-semibold text-lg">AI Alerts</h2>
      {alerts.length > 0 && (
        <span className="text-xs text-gray-500">{alerts.length} total</span>
      )}
    </div>

    {alerts.length === 0 ? (
      <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
        <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center mb-3">
          <Info className="w-5 h-5 text-gray-600" />
        </div>
        <p className="text-gray-500 text-sm">No alerts yet</p>
        <p className="text-gray-600 text-xs mt-1">AI analysis runs every 5 minutes</p>
      </div>
    ) : (
      <div className="space-y-2.5 overflow-y-auto">
        {alerts.map((alert) => {
          const cfg = SEVERITY[alert.severity];
          const Icon = cfg.icon;
          return (
            <div key={alert.id} className={`${cfg.bg} border ${cfg.border} rounded-lg p-3.5`}>
              <div className="flex items-start gap-2.5">
                <Icon className={`w-4 h-4 ${cfg.color} mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1 text-gray-600 text-xs ml-auto">
                      <Clock className="w-3 h-3" />
                      {timeAgo(alert.created_at)}
                    </div>
                  </div>
                  <p className="text-gray-200 text-sm leading-snug">{alert.message}</p>
                  {alert.recommendation && (
                    <p className="text-gray-500 text-xs mt-1.5">
                      <span className="text-gray-400">→</span> {alert.recommendation}
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
);
