import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Project } from '../types';
import { API_URL, API_HEADERS as FETCH_HEADERS } from '../lib/env';

interface ProjectContextValue {
  projects: Project[];
  selectedProject: Project | null;
  selectProject: (project: Project) => void;
  clearProject: () => void;
  refreshProjects: () => Promise<void>;
  createProject: (data: CreateProjectInput) => Promise<Project>;
  updateProject: (id: number, data: UpdateProjectInput) => Promise<Project>;
  deleteProject: (id: number) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  github_repo?: string;
  jira_url?: string;
  slack_webhook?: string;
  teams_webhook?: string;
}

// Updates allow `null` to explicitly clear an optional field.
export type UpdateProjectInput = Partial<{
  name: string;
  description: string | null;
  github_repo: string | null;
  jira_url: string | null;
  slack_webhook: string | null;
  teams_webhook: string | null;
  status: 'active' | 'inactive';
}>;

const ProjectContext = createContext<ProjectContextValue>({
  projects: [],
  selectedProject: null,
  selectProject: () => {},
  clearProject: () => {},
  refreshProjects: async () => {},
  createProject: async () => { throw new Error('not ready'); },
  updateProject: async () => { throw new Error('not ready'); },
  deleteProject: async () => {},
  loading: true,
  error: null,
});

const STORAGE_KEY = 'project_pulse_selected_project_id';

async function fetchProjectList(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/api/projects`, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  return res.json() as Promise<Project[]>;
}

function reconcileStoredProject(
  data: Project[],
  setSelectedProject: React.Dispatch<React.SetStateAction<Project | null>>
) {
  const savedId = localStorage.getItem(STORAGE_KEY);
  if (!savedId) return;
  const found = data.find((p) => p.id === parseInt(savedId));
  if (found) {
    setSelectedProject(found);
  } else {
    // Stored project no longer exists — clear stale ref and show selector
    localStorage.removeItem(STORAGE_KEY);
    setSelectedProject(null);
  }
}

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load — runs exactly once on mount via empty deps.
  // A cancellation flag prevents state updates after unmount (React StrictMode safe).
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProjectList();
        if (cancelled) return;
        setProjects(data);
        reconcileStoredProject(data, setSelectedProject);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load projects');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []); // intentionally empty — one-time mount fetch

  // Manual refresh (called by ProjectSelector on mount and by retry button).
  // Stable identity via empty deps — safe to pass as a useEffect dependency.
  const refreshProjects = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchProjectList();
      setProjects(data);
      reconcileStoredProject(data, setSelectedProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    }
  }, []);

  const selectProject = useCallback((project: Project) => {
    setSelectedProject(project);
    localStorage.setItem(STORAGE_KEY, String(project.id));
  }, []);

  const clearProject = useCallback(() => {
    setSelectedProject(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const createProject = useCallback(async (data: CreateProjectInput): Promise<Project> => {
    const res = await fetch(`${API_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...FETCH_HEADERS },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json() as { error?: string };
      throw new Error(err.error ?? 'Failed to create project');
    }
    const project = await res.json() as Project;
    setProjects((prev) => [project, ...prev]);
    return project;
  }, []);

  const updateProject = useCallback(async (
    id: number,
    data: UpdateProjectInput
  ): Promise<Project> => {
    const res = await fetch(`${API_URL}/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...FETCH_HEADERS },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update project');
    const updated = await res.json() as Project;
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    if (selectedProject?.id === id) setSelectedProject(updated);
    return updated;
  }, [selectedProject]);

  const deleteProject = useCallback(async (id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/api/projects/${id}`, {
      method: 'DELETE',
      headers: FETCH_HEADERS,
    });
    if (!res.ok) throw new Error('Failed to delete project');
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (selectedProject?.id === id) {
      setSelectedProject(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedProject]);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        selectProject,
        clearProject,
        refreshProjects,
        createProject,
        updateProject,
        deleteProject,
        loading,
        error,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => useContext(ProjectContext);
