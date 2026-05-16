import { GitBranch, GitPullRequest, GitCommit, MessageSquare, Ticket, Clock } from 'lucide-react';
import type { Event } from '../../types';

const SOURCE_CONFIG = {
  github: { icon: GitCommit, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'GitHub' },
  jira: { icon: Ticket, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Jira' },
  slack: { icon: MessageSquare, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Slack' },
};

const EVENT_ICON_MAP: Record<string, typeof GitCommit> = {
  pull_request: GitPullRequest,
  branch_created: GitBranch,
  branch_deleted: GitBranch,
};

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const describe = (event: Event): string => {
  const p = event.payload;
  switch (event.type) {
    case 'push':
      return `${p.pusher ?? 'Someone'} pushed ${p.commits ?? 0} commit(s) to ${
        typeof p.ref === 'string' ? p.ref.replace('refs/heads/', '') : 'a branch'
      }`;
    case 'pull_request':
      return `PR #${p.number}: "${p.title}" was ${p.action} by ${p.user ?? 'someone'}`;
    case 'branch_created':
      return `Branch "${p.ref}" was created in ${p.repository ?? 'the repo'}`;
    case 'branch_deleted':
      return `Branch "${p.ref}" was deleted from ${p.repository ?? 'the repo'}`;
    case 'jira_issue':
      return `${p.issue_key}: "${p.summary}" moved to ${p.status}`;
    default:
      if (event.type.startsWith('slack_')) {
        return typeof p.text === 'string' ? p.text : 'New Slack message';
      }
      return `${event.source} event: ${event.type.replace(/_/g, ' ')}`;
  }
};

interface AwarenessFeedProps {
  events: Event[];
}

export const AwarenessFeed = ({ events }: AwarenessFeedProps) => {
  if (events.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
        <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
          <GitCommit className="w-6 h-6 text-gray-600" />
        </div>
        <p className="text-gray-500 text-sm">No events yet</p>
        <p className="text-gray-600 text-xs mt-1">
          Events from GitHub, Jira, and Slack will appear here in real time
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {events.map((event) => {
        const source = event.source in SOURCE_CONFIG ? event.source : 'github';
        const cfg = SOURCE_CONFIG[source as keyof typeof SOURCE_CONFIG];
        const Icon = EVENT_ICON_MAP[event.type] ?? cfg.icon;

        return (
          <div
            key={event.id}
            className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg flex-shrink-0 ${cfg.bg}`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-gray-700">·</span>
                  <span className="text-gray-500 text-xs capitalize">
                    {event.type.replace(/_/g, ' ')}
                  </span>
                  <div className="ml-auto flex items-center gap-1 text-gray-600 text-xs flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {timeAgo(event.created_at)}
                  </div>
                </div>
                <p className="text-gray-200 text-sm leading-snug">{describe(event)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
