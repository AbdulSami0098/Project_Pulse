import type { Task } from '../../types';

const STATUS_CONFIG = {
  in_progress: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/40',
    dot: 'bg-blue-500',
    text: 'text-blue-400',
    label: 'In Progress',
  },
  blocked: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/40',
    dot: 'bg-red-500',
    text: 'text-red-400',
    label: 'Blocked',
  },
  in_review: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/40',
    dot: 'bg-yellow-400',
    text: 'text-yellow-400',
    label: 'In Review',
  },
  done: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/40',
    dot: 'bg-green-500',
    text: 'text-green-400',
    label: 'Done',
  },
} as const;

interface ProjectMapProps {
  tasks: Task[];
  loading?: boolean;
}

export const ProjectMap = ({ tasks, loading = false }: ProjectMapProps) => {
  const statusKeys = Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>;
  const counts = statusKeys.reduce<Record<string, number>>((acc, key) => {
    acc[key] = tasks.filter((t) => t.status === key).length;
    return acc;
  }, {});

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-white font-semibold text-lg">Project Map</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            {loading ? 'Loading…' : `${tasks.length} tasks · live from backend`}
          </p>
        </div>
        {!loading && (
          <div className="flex gap-4">
            {statusKeys.map((key) => {
              const cfg = STATUS_CONFIG[key];
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="text-gray-500 text-xs">
                    {cfg.label} ({counts[key]})
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3.5 animate-pulse">
              <div className="h-4 bg-gray-700 rounded mb-3 w-3/4" />
              <div className="h-3 bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tasks.map((task) => {
            const cfg = STATUS_CONFIG[task.status];
            return (
              <div
                key={task.id}
                className={`${cfg.bg} border ${cfg.border} rounded-lg p-3.5 hover:brightness-110 transition-all cursor-default`}
              >
                <p className="text-white text-sm font-medium leading-snug mb-3">{task.title}</p>
                <div className="flex items-center justify-between gap-1">
                  <span className={`${cfg.text} text-xs font-medium`}>{cfg.label}</span>
                  {task.assignee && (
                    <span className="text-gray-600 text-xs truncate">{task.assignee}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
