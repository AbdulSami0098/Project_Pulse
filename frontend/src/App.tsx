import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { DeveloperFeed } from './pages/DeveloperFeed';
import { AlertsFeed } from './components/dashboard/AlertsFeed';
import { useSocket } from './hooks/useSocket';

const App = () => {
  const { connected, alerts, events, tasks, tasksLoading, analysis, alertsSummary, requestAnalysis } = useSocket();

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-950 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header connected={connected} onRequestAnalysis={requestAnalysis} />
          <main className="flex-1 overflow-hidden flex flex-col">
            <Routes>
              <Route
                path="/"
                element={<Dashboard alerts={alerts} tasks={tasks} tasksLoading={tasksLoading} analysis={analysis} alertsSummary={alertsSummary} />}
              />
              <Route
                path="/feed"
                element={<DeveloperFeed events={events} />}
              />
              <Route
                path="/alerts"
                element={
                  <div className="flex-1 overflow-auto p-6">
                    <div className="max-w-3xl">
                      <div className="mb-6">
                        <h2 className="text-white font-semibold text-xl">All Alerts</h2>
                        <p className="text-gray-500 text-sm mt-1">
                          Complete history of AI-generated alerts
                        </p>
                      </div>
                      <AlertsFeed alerts={alerts} />
                    </div>
                  </div>
                }
              />
              <Route
                path="/settings"
                element={
                  <div className="flex-1 overflow-auto p-6">
                    <div className="max-w-2xl">
                      <div className="mb-6">
                        <h2 className="text-white font-semibold text-xl">Settings</h2>
                        <p className="text-gray-500 text-sm mt-1">
                          Configure integrations and preferences
                        </p>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
                        {[
                          { label: 'GitHub Webhook URL', value: '/api/github/webhook' },
                          { label: 'Jira Webhook URL', value: '/api/jira/webhook' },
                          { label: 'Slack Webhook URL', value: '/api/slack/webhook' },
                          { label: 'Analysis Interval', value: 'Every 5 minutes' },
                        ].map(({ label, value }) => (
                          <div key={label} className="px-5 py-4 flex items-center justify-between">
                            <span className="text-gray-400 text-sm">{label}</span>
                            <span className="text-gray-200 text-sm font-mono bg-gray-800 px-2.5 py-1 rounded">
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
