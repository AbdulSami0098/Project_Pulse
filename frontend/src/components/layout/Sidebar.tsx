import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Radio, Bell, Settings, Zap, ChevronDown, Plus, LogOut, Sparkles } from 'lucide-react';
import { useProjectContext } from '../../contexts/ProjectContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/feed', label: 'Developer Feed', icon: Radio },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/intelligence', label: 'Intelligence', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const ProjectDropdown = () => {
  const { projects, selectedProject, selectProject, clearProject } = useProjectContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!selectedProject) return null;

  return (
    <div ref={ref} className="relative mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors group"
      >
        <span className="text-gray-300 text-xs font-medium truncate">{selectedProject.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => { selectProject(p); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-xs transition-colors ${
                  p.id === selectedProject.id
                    ? 'text-blue-400 bg-blue-500/10'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-700">
            <NavLink
              to="/projects"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-3 h-3" />
              New Project
            </NavLink>
            <button
              onClick={() => { clearProject(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Switch Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const Sidebar = () => (
  <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
    <div className="p-6 border-b border-gray-800">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">Project Pulse</span>
      </div>
      <p className="text-gray-500 text-xs mt-1.5 ml-0.5">AI Project Intelligence</p>
      <ProjectDropdown />
    </div>

    <nav className="flex-1 p-3 space-y-0.5">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`
          }
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>

    <div className="p-4 border-t border-gray-800 text-center">
      <span className="text-gray-700 text-xs">v2.0.0</span>
    </div>
  </aside>
);
