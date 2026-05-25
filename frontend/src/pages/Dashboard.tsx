import { ProjectMap } from '../components/dashboard/ProjectMap';
import { AlertsFeed } from '../components/dashboard/AlertsFeed';
import type { Alert, Task, AlertsSummary, AnalysisUpdate } from '../types';
import { Sparkles } from 'lucide-react';

interface DashboardProps {
  alerts: Alert[];
  tasks: Task[];
  tasksLoading: boolean;
  analysis: AnalysisUpdate | null;
  alertsSummary: AlertsSummary;
}

const SUMMARY_TILES = (s: AlertsSummary) => [
  { label: 'Total Risk Indicators', value: s.total, color: 'text-white' },
  { label: 'High Severity', value: s.high, color: 'text-red-400' },
  { label: 'Medium Severity', value: s.medium, color: 'text-yellow-400' },
  { label: 'Low Severity', value: s.low, color: 'text-blue-400' },
];

export const Dashboard = ({ alerts, tasks, tasksLoading, analysis, alertsSummary }: DashboardProps) => (
  <div className="flex-1 overflow-auto p-6 space-y-6">
    {analysis && (
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <h3 className="text-blue-400 text-sm font-semibold">AI Analysis</h3>
          <span className="text-gray-600 text-xs ml-auto">
            {new Date(analysis.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">{analysis.summary}</p>
        {analysis.recommendations.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {analysis.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                <span className="text-blue-400 font-bold mt-0.5">→</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    <ProjectMap tasks={tasks} loading={tasksLoading} />

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <AlertsFeed alerts={alerts} />

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Activity Summary</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {SUMMARY_TILES(alertsSummary).map(({ label, value, color }) => (
            <div key={label} className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-gray-500 text-xs mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
