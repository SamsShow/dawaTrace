import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, AlertTriangle, BarChart2, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const NAV = [
    { to: '/dashboard', label: t('nav.overview'), icon: LayoutDashboard },
    { to: '/batches', label: t('nav.batches'), icon: Package },
    { to: '/recalls', label: t('nav.recalls'), icon: AlertTriangle },
    { to: '/analytics', label: t('nav.analytics'), icon: BarChart2 },
  ];

  return (
    <aside className="w-52 shrink-0 bg-background border-r border-border flex flex-col h-screen sticky top-0">
      <div className="px-4 py-4">
        <span className="text-sm font-semibold tracking-tight">DawaTrace</span>
        <p className="text-[11px] text-muted-foreground mt-0.5">{t('sidebar.subtitle')}</p>
      </div>

      <Separator />

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-2.5 py-1.5 text-sm rounded-md transition-colors',
                isActive
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )
            }
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <Separator />

      <div className="px-4 py-3">
        <p className="text-xs text-foreground font-mono truncate mb-1">{user?.nodeId}</p>
        <p className="text-[11px] text-muted-foreground mb-2">{user?.orgRole}</p>
        <div className="flex items-center justify-between">
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-3 w-3" />
            {t('sidebar.signOut')}
          </button>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </aside>
  );
}
