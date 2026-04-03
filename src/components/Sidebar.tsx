'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, AlertTriangle, BarChart2, Shield, Flag, Mail, LogOut, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

function getInitials(nodeId: string | undefined): string {
  if (!nodeId) return '??';
  const parts = nodeId.split('-');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nodeId.slice(0, 2).toUpperCase();
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const pathname = usePathname();

  const canInvite = user?.orgRole === 'REGULATOR' || user?.orgRole === 'MANUFACTURER' || user?.orgRole === 'DISTRIBUTOR';

  const NAV = [
    { to: '/dashboard', label: t('nav.overview'), icon: LayoutDashboard },
    { to: '/batches', label: t('nav.batches'), icon: Package },
    { to: '/recalls', label: t('nav.recalls'), icon: AlertTriangle },
    { to: '/analytics', label: t('nav.analytics'), icon: BarChart2 },
    ...(canInvite
      ? [{ to: '/invitations', label: 'Invitations', icon: Mail }]
      : []),
    ...(user?.orgRole === 'REGULATOR'
      ? [
          { to: '/reports', label: t('nav.reports', 'Reports'), icon: Flag },
          { to: '/admin', label: t('nav.admin'), icon: Shield },
        ]
      : []),
  ];

  return (
    <TooltipProvider delay={300}>
      <aside className="w-56 shrink-0 bg-background border-r border-border flex flex-col h-screen sticky top-0">
        {/* Brand header */}
        <div className="px-4 py-4 flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-primary-foreground">DT</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight leading-none">DawaTrace</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{t('sidebar.subtitle')}</p>
          </div>
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => {
            const isActive = pathname === to || (to !== '/dashboard' && pathname.startsWith(to));
            return (
              <Tooltip key={to}>
                <TooltipTrigger className="w-full block">
                  <Link
                    href={to}
                    className={cn(
                      'flex items-center gap-2.5 h-9 px-2.5 text-sm rounded-lg transition-all w-full',
                      'border-l-2',
                      isActive
                        ? 'bg-accent text-foreground font-medium border-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent border-transparent'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <Separator />

        {/* User section */}
        <div className="px-2 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg',
                'text-left transition-all outline-none cursor-pointer',
                'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50',
                'group'
              )}
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                  {getInitials(user?.nodeId)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-mono font-medium text-foreground truncate leading-tight">
                  {user?.nodeId}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {user?.orgRole}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform group-data-[popup-open]:rotate-180" />
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={6}
              className="w-52 rounded-xl shadow-lg p-1"
            >
              <div className="px-2 py-1.5 mb-1">
                <p className="text-xs font-mono font-medium text-foreground truncate">{user?.nodeId}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{user?.orgRole}</p>
              </div>

              <DropdownMenuSeparator />

              <div className="px-2 py-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Language</span>
                <LanguageSelector />
              </div>

              <div className="px-2 py-1.5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={logout}
                className="flex items-center gap-2 text-xs rounded-lg cursor-pointer text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t('sidebar.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}
