import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/recalls', label: 'Recalls', icon: '🚨' },
  { to: '/analytics', label: 'Analytics', icon: '📈' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-5 border-b border-gray-100">
        <h1 className="text-lg font-bold text-brand-700">DawaTrace</h1>
        <p className="text-xs text-gray-400 mt-0.5">Regulator Dashboard</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-2">{user?.nodeId}</p>
        <button
          onClick={logout}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
