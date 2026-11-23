'use client';

import { useSyncExternalStore } from 'react';
import { slowRequests } from '../api/client';
import { useScrollLock } from '../components/ui';

/**
 * Full-screen loader while any request is taking longer than expected (see SLOW_MS in api/client):
 * a spinner in the center over a blurred page that can't be clicked or scrolled until the request finishes.
 */
export function SlowLoader() {
  const slow = useSyncExternalStore(slowRequests.subscribe, slowRequests.getSnapshot, () => false);
  useScrollLock(slow);
  if (!slow) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(251,246,239,0.55)] backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-3 rounded-card bg-surface-card px-8 py-6 shadow-l3">
        <span aria-hidden="true" className="h-10 w-10 animate-spin rounded-full border-4 border-primary-tint border-t-primary" />
        <span className="text-label-lg text-text-primary">Loading…</span>
      </div>
    </div>
  );
}
