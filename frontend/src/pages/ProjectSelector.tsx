import { useState } from 'react';
import { Zap, Plus, CheckCircle, XCircle, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { useProjectContext, CreateProjectInput } from '../contexts/ProjectContext';
import type { Project } from '../types';

function getBackendUrl(): string {
  if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL as string;
  return `${window.location.protocol}//${window.location.hostname}:3001`;
}

// ── Webhook URL modal shown after project creation ──────────────────────────

interface WebhookUrlsProps {
  project: Project;
  onClose: () => void;
}

const WebhookUrls = ({ project, onClose }: WebhookUrlsProps) => {
  const base = getBackendUrl();
  const [copied, setCopied] = useState<string | null>(null);

  const urls = [
    { label: 'GitHub Webhook URL', key: 'github', url: `${base}/api/projects/${project.id}/webhooks/github` },
    { label: 'Jira Webhook URL', key: 'jira', url: `${base}/api/projects/${project.id}/webhooks/jira` },
    { label: 'Slack Events URL', key: 'slack', url: `${base}/api/projects/${project.id}/webhooks/slack` },
    { label: 'MS Teams Incoming URL', key: 'teams', url: `${base}/api/projects/${project.id}/webhooks/teams` },
  ];

  const copy = async (key: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-white font-semibold text-lg">Project Created!</h2>
            <p className="text-gray-400 text-sm mt-0.5">Copy these URLs into your tools to start receiving events</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {urls.map(({ label, key, url }) => (
            <div key={key} className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-xs mb-2">{label}</p>
              <div className="flex items-center gap-2">
                <code className="text-blue-300 text-xs font-mono flex-1 truncate">{url}</code>
                <button
                  onClick={() => copy(key, url)}
                  className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors flex-shrink-0"
                >
                  {copied === key ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
          >
            Open Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Create project form modal ────────────────────────────────────────────────

interface CreateProjectFormProps {
  onClose: () => void;
  onCreated: (project: Project) => void;
}

const CreateProjectForm = ({ onClose, onCreated }: CreateProjectFormProps) => {
  const { createProject, selectProject } = useProjectContext();
  const [form, setForm] = useState<CreateProjectInput>({ name: '', description: '', teams_webhook: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Project name is required'); return; }
    setSaving(true);
    setFormError('');
    try {
      const project = await createProject({
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        teams_webhook: form.teams_webhook?.trim() || undefined,
      });
      selectProject(project);
      onCreated(project);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-white font-semibold text-lg">New Project</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Project Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="My Awesome Project"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What is this project about?"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600 resize-none"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1.5">
              MS Teams Webhook URL <span className="text-gray-600">(optional)</span>
            </label>
            <input
              type="url"
              value={form.teams_webhook}
              onChange={(e) => setForm((f) => ({ ...f, teams_webhook: e.target.value }))}
              placeholder="https://your-org.webhook.office.com/..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
            />
            <p className="text-gray-600 text-xs mt-1">
              In MS Teams: channel → Connectors → Incoming Webhook → copy URL
            </p>
          </div>
          {formError && <p className="text-red-400 text-sm">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-700 text-gray-400 rounded-lg text-sm hover:border-gray-600 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Integration status badge ─────────────────────────────────────────────────

const IntegrationBadge = ({ connected }: { connected: boolean }) =>
  connected ? (
    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
  ) : (
    <XCircle className="w-3.5 h-3.5 text-gray-600" />
  );

// ── Loading spinner ──────────────────────────────────────────────────────────

const Spinner = () => (
  <div className="flex flex-col items-center gap-3 py-12">
    <div className="w-8 h-8 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
    <p className="text-gray-500 text-sm">Loading projects...</p>
  </div>
);

// ── Main page ────────────────────────────────────────────────────────────────

export const ProjectSelector = () => {
  const { projects, selectProject, loading, error, refreshProjects } = useProjectContext();
  const [showCreate, setShowCreate] = useState(false);
  const [createdProject, setCreatedProject] = useState<Project | null>(null);

  const handleCreated = (project: Project) => {
    setShowCreate(false);
    setCreatedProject(project);
  };

  const handleWebhookClose = () => {
    setCreatedProject(null);
  };

  const renderContent = () => {
    if (loading) return <Spinner />;

    if (error) {
      return (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-white font-medium">Could not reach backend</p>
            <p className="text-gray-500 text-sm mt-1">{error}</p>
            <p className="text-gray-600 text-xs mt-1">
              Make sure the backend is running at{' '}
              <code className="text-gray-400">{import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'}</code>
            </p>
          </div>
          <button
            onClick={() => refreshProjects()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      );
    }

    return (
      <>
        {projects.length > 0 && (
          <div className="space-y-3 mb-6">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => selectProject(project)}
                className="w-full bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 text-left transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-semibold group-hover:text-blue-400 transition-colors">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-gray-500 text-sm mt-1">{project.description}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    project.status === 'active'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-gray-800 text-gray-500'
                  }`}>
                    {project.status}
                  </span>
                </div>
                {project.integrations && (
                  <div className="flex items-center gap-4 mt-3">
                    {(['github', 'jira', 'slack', 'teams'] as const).map((key) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <IntegrationBadge connected={!!project.integrations![key]} />
                        <span className="text-gray-500 text-xs capitalize">{key}</span>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowCreate(true)}
          className="w-full bg-gray-900 border border-dashed border-gray-700 hover:border-blue-500 rounded-xl p-5 text-center transition-colors group"
        >
          <div className="flex items-center justify-center gap-2 text-gray-500 group-hover:text-blue-400 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="font-medium text-sm">Create New Project</span>
          </div>
        </button>

        {projects.length === 0 && (
          <p className="text-center text-gray-600 text-sm mt-4">
            No projects yet — create your first one above
          </p>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight">Project Pulse</h1>
          <p className="text-gray-500 mt-2">Select a project to get started</p>
        </div>

        {renderContent()}
      </div>

      {showCreate && (
        <CreateProjectForm onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}

      {createdProject && (
        <WebhookUrls project={createdProject} onClose={handleWebhookClose} />
      )}
    </div>
  );
};
