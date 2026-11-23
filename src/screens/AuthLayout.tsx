'use client';

import type { ReactNode } from 'react';
import { Icon, Wordmark } from '../components/ui';

const STEPS = [
  { icon: 'restaurant_menu', text: "See today's menu and what's left before you leave your desk" },
  { icon: 'schedule', text: 'Order before 11:00 and pick a 15-minute pickup slot' },
  { icon: 'qr_code_2', text: 'Show your QR pass at the counter and collect in seconds' },
  { icon: 'receipt_long', text: 'No payment step: orders go on your monthly canteen statement' },
];

/** Auth shell: split screen on desktop (terracotta brand panel + form), card on phone (UI spec §4). */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="hidden flex-col justify-between bg-primary p-12 text-white lg:flex">
        <Wordmark inverted subtitle="Office canteen pre-order" />
        <div>
          <h2 className="max-w-md text-headline-xl">Lunch, ready when you are.</h2>
          <ul className="mt-8 space-y-4">
            {STEPS.map((s) => (
              <li key={s.icon} className="flex items-start gap-3 text-body-lg text-white/90">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-btn bg-white/15">
                  <Icon name={s.icon} size={18} />
                </span>
                {s.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-body-sm text-white/70">Building 4 · Counter A</p>
      </aside>
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10 lg:min-h-0">
        <div className="mb-8 text-center lg:hidden">
          <Wordmark />
          <p className="mt-2 text-body-md text-text-secondary">Order lunch before you reach the canteen.</p>
        </div>
        <div className="w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  );
}
