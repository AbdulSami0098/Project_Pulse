import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Copy, Check, Trash2, Save } from 'lucide-react';
import { useProjectContext } from '../contexts/ProjectContext';
import type { Project, Event } from '../types';

function getBackendUrl(): string {
  if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL as string;
  return `${window.location.protocol}//${window.location.hostname}:3001`;
}

function formatLastReceived(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Last received: just now';
  if (minutes < 60) return `Last received: ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last received: ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Last received: ${days}d ago`;
}

const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="p-1.5 text-gray-500 hover:text-white transition-colors rounded"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

const StatusBadge = ({ lastReceived }: { lastReceived: string | null }) => (
  <div className={`flex items-center gap-1.5 text-xs font-medium ${lastReceived ? 'text-green-400' : 'text-gray-600'}`}>
    {lastReceived ? (
      <><CheckCircle className="w-3.5 h-3.5" />{formatLastReceived(lastReceived)}</>
    ) : (
      <><XCircle className="w-3.5 h-3.5" />No events received yet</>
    )}
  </div>
);

interface IntegrationCardProps {
  title: string;
  description: string;
  webhookUrl: string;
  lastReceived: string | null;
  instructions?: string;
}

const IntegrationCard = ({ title, description, webhookUrl, lastReceived, instructions }: IntegrationCardProps) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <div className="flex items-start justify-between mb-3">
      <div>
        <h3 className="text-white font-medium text-sm">{title}</h3>
        <p className="text-gray-500 text-xs mt-0.5">{description}</p>
      </div>
      <StatusBadge lastReceived={lastReceived} />
    </div>
    <div className="bg-gray-800 rounded-lg px-3 py-2 flex items-center gap-2">
      <code className="text-blue-300 text-xs font-mono flex-1 truncate">{webhookUrl}</code>
      <CopyButton value={webhookUrl} />
    </div>
    {instructions && (
      <p className="text-gray-600 text-xs mt-2">{instructions}</p>
    )}
  </div>
);

interface TeamsCardProps {
  projectId: number;
  currentWebhook: string | null;
  lastReceived: string | null;
  onSave: (webhook: string) => Promise<void>;
}

const TeamsCard = ({ projectId, currentWebhook, lastReceived, onSave }: TeamsCardProps) => {
  const base = getBackendUrl();
  const incomingUrl = `${base}/api/projects/${projectId}/webhooks/teams`;
  const [value, setValue] = useState(currentWebhook ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(currentWebhook ?? '');
  }, [currentWebhook]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(value.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-medium text-sm">MS Teams</h3>
          <p className="text-gray-500 text-xs mt-0.5">Receive AI alerts directly in a Teams channel</p>
        </div>
        <StatusBadge lastReceived={lastReceived} />
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-gray-500 text-xs mb-1.5">Incoming events URL (paste into Teams Connector):</p>
          <div className="bg-gray-800 rounded-lg px-3 py-2 flex items-center gap-2">
            <code className="text-blue-300 text-xs font-mono flex-1 truncate">{incomingUrl}</code>
            <CopyButton value={incomingUrl} />
          </div>
        </div>

        <div>
          <p className="text-gray-500 text-xs mb-1.5">Teams Outgoing Webhook URL (for alert notifications):</p>
          <div className="flex gap-2">
            <input
              type="url"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://your-org.webhook.office.com/..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
            </button>
          </div>
          <p className="text-gray-600 text-xs mt-1.5">
            In MS Teams: channel → Connectors → Incoming Webhook → copy URL and paste here
          </p>
        </div>
      </div>
    </div>
  );
};

type SourceMap = Record<string, string | null>;

function latestBySource(events: Event[]): SourceMap {
  const map: SourceMap = { github: null, jira: null, slack: null, teams: null };
  for (const ev of events) {
    const src = ev.source as string;
    if (!(src in map)) continue;
    const current = map[src];
    if (!current || new Date(ev.created_at) > new Date(current)) {
      map[src] = ev.created_at;
    }
  }
  return map;
}

export const Settings = () => {
  const { selectedProject, updateProject, deleteProject, refreshProjects } = useProjectContext();
  const [project, setProject] = useState<Project | null>(selectedProject);
  const [lastReceivedBySource, setLastReceivedBySource] = useState<SourceMap>({
    github: null, jira: null, slack: null, teams: null,
  });
  const [form, setForm] = useState({ name: '', description: '' });
  const [formDirty, setFormDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const base = getBackendUrl();

  useEffect(() => {
    if (selectedProject) {
      setProject(selectedProject);
      setForm({ name: selectedProject.name, description: selectedProject.description ?? '' });
      setFormDirty(false);
    }
  }, [selectedProject]);

  // Fetch project detail + events for integration status on mount / project change
  useEffect(() => {
    if (!selectedProject) return;
    const apiBase = getBackendUrl();

    const fetchData = async () => {
      try {
        const [detailRes, eventsRes] = await Promise.all([
          fetch(`${apiBase}/api/projects/${selectedProject.id}`),
          fetch(`${apiBase}/api/projects/${selectedProject.id}/events`),
        ]);

        if (detailRes.ok) {
          setProject(await detailRes.json() as Project);
        }

        if (eventsRes.ok) {
          const events = await eventsRes.json() as Event[];
          setLastReceivedBySource(latestBySource(events));
        }
      } catch { /* ignore — backend may not be reachable */ }
    };

    fetchData();
  }, [selectedProject]);

  if (!project) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <p className="text-gray-500">No project selected.</p>
      </div>
    );
  }

  const handleSaveDetails = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await updateProject(project.id, { name: form.name.trim(), description: form.description.trim() });
      setSaved(true);
      setFormDirty(false);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTeams = async (webhook: string) => {
    await updateProject(project.id, { teams_webhook: webhook || null as unknown as string });
    await refreshProjects();
  };

  const handleDelete = async () => {
    await deleteProject(project.id);
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-white font-semibold text-xl">Settings</h2>
          <p className="text-gray-500 text-sm mt-1">Configure {project.name}</p>
        </div>

        {/* Project details */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-medium text-sm mb-4">Project Details</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-gray-400 text-xs mb-1.5">Project Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setFormDirty(true); }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => { setForm((f) => ({ ...f, description: e.target.value })); setFormDirty(true); }}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            {formDirty && (
              <button
                onClick={handleSaveDetails}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        {/* Integrations */}
        <div>
          <h3 className="text-white font-medium text-sm mb-3">Integrations</h3>
          <div className="space-y-3">
            <IntegrationCard
              title="GitHub"
              description="Receive push, pull request, and branch events"
              webhookUrl={`${base}/api/projects/${project.id}/webhooks/github`}
              lastReceived={lastReceivedBySource.github}
              instructions="In GitHub: repo → Settings → Webhooks → Add webhook → paste URL, set Content-Type to application/json"
            />
            <IntegrationCard
              title="Jira"
              description="Receive issue and transition events"
              webhookUrl={`${base}/api/projects/${project.id}/webhooks/jira`}
              lastReceived={lastReceivedBySource.jira}
              instructions="In Jira: Settings → System → Webhooks → Create → paste URL"
            />
            <IntegrationCard
              title="Slack"
              description="Receive Slack event messages"
              webhookUrl={`${base}/api/projects/${project.id}/webhooks/slack`}
              lastReceived={lastReceivedBySource.slack}
              instructions="In Slack API: App → Event Subscriptions → Request URL → paste URL"
            />
            <TeamsCard
              projectId={project.id}
              currentWebhook={project.teams_webhook}
              lastReceived={lastReceivedBySource.teams}
              onSave={handleSaveTeams}
            />
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
          <h3 className="text-red-400 font-medium text-sm mb-1">Danger Zone</h3>
          <p className="text-gray-500 text-xs mb-4">Deleting a project removes all its events, alerts, and data permanently.</p>
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Project
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">Are you sure?</span>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-700 text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
