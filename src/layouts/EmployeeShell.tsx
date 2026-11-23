'use client';

import type { ReactNode } from 'react';
import { NavLink } from '@/lib/navigation';
import { useMe, useSettings } from '../api/hooks';
import { Avatar, Button, Icon, Wordmark } from '../components/ui';
import { useLogoutAction } from './useLogoutAction';

const NAV = [
  { to: '/menu', label: 'Menu', icon: 'restaurant_menu' },
  { to: '/orders', label: 'My orders', icon: 'receipt_long' },
  { to: '/profile', label: 'Profile', icon: 'person' },
];

/** Employee shell: mobile header + bottom nav; desktop top bar (UI spec §4). */
export function EmployeeShell({ children }: { children: ReactNode }) {
  const user = useMe().data?.user;
  const location = useSettings().data?.pickupLocation;
  const logout = useLogoutAction();
  if (!user) return null;
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border-sand bg-surface-cream/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-content items-center gap-4 px-4 md:px-8">
          <Wordmark subtitle={location} />
          <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
            {NAV.slice(0, 2).map((n) => (
              <NavLink
                key={n.to}
                href={n.to}
                className={({ isActive }) =>
                  `inline-flex min-h-[44px] items-center rounded-btn px-3 text-label-lg ${isActive ? 'bg-primary-tint text-primary-active' : 'text-text-secondary hover:bg-border-sand'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-label-lg">{user.name}</p>
              {user.employeeCode && <p className="font-mono text-body-sm text-text-secondary">{user.employeeCode}</p>}
            </div>
            <NavLink href="/profile" aria-label="Profile" className="inline-flex h-11 w-11 items-center justify-center rounded-full">
              <Avatar name={user.name} role={user.role} />
            </NavLink>
            <Button variant="ghost" icon="logout" className="hidden md:inline-flex" onClick={logout.run} loading={logout.pending}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-content px-4 py-6 md:px-8">
        {children}
      </main>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-border-sand bg-white md:hidden">
        <ul className="grid grid-cols-3">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                href={n.to}
                className={({ isActive }) =>
                  `flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-label-md ${isActive ? 'text-primary' : 'text-text-secondary'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={n.icon} filled={isActive} />
                    {n.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
