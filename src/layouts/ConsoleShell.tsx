'use client';

import type { ReactNode } from 'react';
import { NavLink } from '@/lib/navigation';
import type { Role } from '@/shared';
import { useMe, useSettings } from '../api/hooks';
import { Avatar, Button, Icon, Pill, Wordmark } from '../components/ui';
import { clockIST, formatDate } from '../lib/format';
import { useServerClock } from '../lib/serverClock';
import { useLogoutAction } from './useLogoutAction';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

/** Console navigation by role (UI spec §4, D19: settings are admin-only). */
export const CONSOLE_NAV: Partial<Record<Role, NavItem[]>> = {
  MANAGER: [
    { to: '/manager/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/manager/daily-menu', label: 'Daily Menu Editor', icon: 'edit_calendar' },
    { to: '/manager/menu-items', label: 'Menu Catalogue', icon: 'menu_book' },
    { to: '/manager/exports', label: 'Exports', icon: 'download' },
  ],
  ADMIN: [
    { to: '/manager/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/admin/users', label: 'Users & Roles', icon: 'group' },
    { to: '/admin/settings', label: 'Settings & Rules', icon: 'tune' },
    { to: '/manager/exports', label: 'Exports', icon: 'download' },
  ],
};

/** Manager / admin console: left sidebar (264 px), stacks above content under ~900 px. */
export function ConsoleShell({ children }: { children: ReactNode }) {
  const user = useMe().data?.user;
  const settings = useSettings().data;
  const logout = useLogoutAction();
  const clock = useServerClock(); // every hook before the early return (rules of hooks)
  if (!user) return null;
  const nav = CONSOLE_NAV[user.role] ?? [];
  const open = settings && clock.now ? clockIST(clock.now) < settings.orderCutoff : undefined;
  return (
    <div className="min-h-screen min-[900px]:flex">
      <aside className="border-b border-border-sand bg-white min-[900px]:sticky min-[900px]:top-0 min-[900px]:flex min-[900px]:h-screen min-[900px]:w-[264px] min-[900px]:shrink-0 min-[900px]:flex-col min-[900px]:border-b-0 min-[900px]:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <Wordmark subtitle={user.role === 'ADMIN' ? 'Admin console' : 'Manager console'} />
        </div>
        {open !== undefined && (
          <div className="px-5 pb-3">
            <Pill tone={open ? 'success' : 'neutral'} icon={open ? 'schedule' : 'lock_clock'}>
              {open ? `Ordering open until ${settings?.orderCutoff}` : 'Ordering closed for today'}
            </Pill>
          </div>
        )}
        <nav aria-label="Console" className="flex gap-1 overflow-x-auto px-3 pb-3 min-[900px]:flex-1 min-[900px]:flex-col min-[900px]:overflow-visible">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              href={n.to}
              className={({ isActive }) =>
                `flex min-h-[44px] shrink-0 items-center gap-3 rounded-btn px-3 text-label-lg ${isActive ? 'bg-primary text-white' : 'text-text-secondary hover:bg-border-sand'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={n.icon} filled={isActive} size={20} />
                  {n.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-border-sand px-5 py-4 text-body-sm text-text-secondary min-[900px]:block">
          Last updated {clock.now ? clockIST(clock.now) : '—'}
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-sand bg-surface-cream px-4 py-3 md:px-8">
          <p className="flex items-center gap-2 text-label-lg text-text-secondary">
            <Icon name="calendar_today" size={18} /> {clock.today ? formatDate(clock.today, true) : ''}
          </p>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-label-lg">{user.name}</p>
              <p className="text-body-sm capitalize text-text-secondary">{user.role.toLowerCase()}</p>
            </div>
            <Avatar name={user.name} role={user.role} />
            <Button variant="ghost" icon="logout" onClick={logout.run} loading={logout.pending}>
              Log out
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-content px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
