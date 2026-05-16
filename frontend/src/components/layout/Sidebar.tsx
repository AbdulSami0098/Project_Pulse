import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Radio, Bell, Settings, Zap } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/feed', label: 'Developer Feed', icon: Radio },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];

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
      <span className="text-gray-700 text-xs">v1.0.0</span>
    </div>
  </aside>
);
