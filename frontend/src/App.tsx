import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { DeveloperFeed } from './pages/DeveloperFeed';
import { Settings } from './pages/Settings';
import { Intelligence } from './pages/Intelligence';
import { ProjectSelector } from './pages/ProjectSelector';
import { AlertsFeed } from './components/dashboard/AlertsFeed';
import { ProjectProvider, useProjectContext } from './contexts/ProjectContext';
import { useSocket } from './hooks/useSocket';

const MainApp = () => {
  const { selectedProject } = useProjectContext();
  const { connected, alerts, events, tasks, tasksLoading, analysis, alertsSummary, requestAnalysis } =
    useSocket(selectedProject?.id ?? null);

  if (!selectedProject) {
    return <ProjectSelector />;
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header connected={connected} projectName={selectedProject.name} onRequestAnalysis={requestAnalysis} />
        <main className="flex-1 overflow-hidden flex flex-col">
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  alerts={alerts}
                  tasks={tasks}
                  tasksLoading={tasksLoading}
                  analysis={analysis}
                  alertsSummary={alertsSummary}
                />
              }
            />
            <Route path="/feed" element={<DeveloperFeed events={events} />} />
            <Route
              path="/alerts"
              element={
                <div className="flex-1 overflow-auto p-6">
                  <div className="max-w-3xl">
                    <div className="mb-6">
                      <h2 className="text-white font-semibold text-xl">All Alerts</h2>
                      <p className="text-gray-500 text-sm mt-1">Complete history of AI-generated alerts</p>
                    </div>
                    <AlertsFeed alerts={alerts} />
                  </div>
                </div>
              }
            />
            <Route path="/intelligence" element={<Intelligence />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/projects" element={<ProjectSelector />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <ProjectProvider>
      <MainApp />
    </ProjectProvider>
  </BrowserRouter>
);

export default App;
