import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Project } from '../types';

const API_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

interface ProjectContextValue {
  projects: Project[];
  selectedProject: Project | null;
  selectProject: (project: Project) => void;
  clearProject: () => void;
  refreshProjects: () => Promise<void>;
  createProject: (data: CreateProjectInput) => Promise<Project>;
  updateProject: (id: number, data: Partial<CreateProjectInput & { status: 'active' | 'inactive' }>) => Promise<Project>;
  deleteProject: (id: number) => Promise<void>;
  loading: boolean;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  github_repo?: string;
  jira_url?: string;
  slack_webhook?: string;
  teams_webhook?: string;
}

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
});

const STORAGE_KEY = 'project_pulse_selected_project_id';

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async (): Promise<Project[]> => {
    const res = await fetch(`${API_URL}/api/projects`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json() as Promise<Project[]>;
  }, []);

  const refreshProjects = useCallback(async () => {
    try {
      const data = await fetchProjects();
      setProjects(data);

      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        const found = data.find((p) => p.id === parseInt(savedId));
        if (found) setSelectedProject(found);
      }
    } catch {
      // backend might not be running; keep empty
    }
  }, [fetchProjects]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await refreshProjects();
      setLoading(false);
    };
    init();
  }, [refreshProjects]);

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
      headers: { 'Content-Type': 'application/json' },
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
    data: Partial<CreateProjectInput & { status: 'active' | 'inactive' }>
  ): Promise<Project> => {
    const res = await fetch(`${API_URL}/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update project');
    const updated = await res.json() as Project;
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    if (selectedProject?.id === id) setSelectedProject(updated);
    return updated;
  }, [selectedProject]);

  const deleteProject = useCallback(async (id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/api/projects/${id}`, { method: 'DELETE' });
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
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => useContext(ProjectContext);
