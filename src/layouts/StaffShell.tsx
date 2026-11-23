'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { NavLink } from '@/lib/navigation';
import { useMe, useSettings } from '../api/hooks';
import { Avatar, Button, Icon, Wordmark } from '../components/ui';
import { clockIST } from '../lib/format';
import { useServerClock } from '../lib/serverClock';
import { useLogoutAction } from './useLogoutAction';

const TABS = [
  { to: '/staff/queue', label: 'Queue', icon: 'view_kanban' },
  { to: '/staff/scan', label: 'Scan', icon: 'qr_code_scanner' },
  { to: '/staff/prep', label: 'Prep list', icon: 'checklist' },
];

/** Counter clock on server time (BUG-03-001), refreshed every 15 s. */
function useClock(): string {
  const { now } = useServerClock(15_000);
  return now ? clockIST(now) : '--:--';
}

/** Staff counter shell: top bar with tabs, clock and a big Scan button (UI spec §4). */
export function StaffShell({ children }: { children: ReactNode }) {
  const user = useMe().data?.user;
  const location = useSettings().data?.pickupLocation;
  const time = useClock();
  const logout = useLogoutAction();
  if (!user) return null;
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border-sand bg-white print:hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <Wordmark subtitle={`Counter · ${location ?? ''}`} />
          <nav aria-label="Counter" className="order-last flex w-full gap-1 md:order-none md:ml-6 md:w-auto">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                href={t.to}
                className={({ isActive }) =>
                  `flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-btn px-3 text-label-lg md:flex-none ${isActive ? 'bg-primary-tint text-primary-active' : 'text-text-secondary hover:bg-border-sand'}`
                }
              >
                <Icon name={t.icon} size={20} />
                {t.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="font-mono text-headline-sm tabular" aria-label={`Time ${time}`}>{time}</span>
            <Link
              href="/staff/scan"
              className="hidden min-h-[48px] items-center gap-2 rounded-btn bg-primary px-5 text-label-lg font-semibold text-white hover:bg-primary-hover sm:inline-flex"
            >
              <Icon name="qr_code_scanner" size={20} /> Scan / Enter code
            </Link>
            <Avatar name={user.name} role={user.role} />
            <Button variant="ghost" icon="logout" onClick={logout.run} loading={logout.pending} aria-label="Log out" />
          </div>
        </div>
      </header>
      <main className="px-4 py-6 md:px-6">
        {children}
      </main>
    </div>
  );
}
