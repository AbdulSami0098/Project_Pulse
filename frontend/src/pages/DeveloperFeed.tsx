import { AwarenessFeed } from '../components/developer/AwarenessFeed';
import type { Event } from '../types';

interface DeveloperFeedProps {
  events: Event[];
}

export const DeveloperFeed = ({ events }: DeveloperFeedProps) => (
  <div className="flex-1 overflow-auto p-6">
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-white font-semibold text-xl">Developer Feed</h2>
        <p className="text-gray-500 text-sm mt-1">
          Real-time events from GitHub, Jira, and Slack — {events.length} event
          {events.length !== 1 ? 's' : ''} loaded
        </p>
      </div>
      <AwarenessFeed events={events} />
    </div>
  </div>
);
