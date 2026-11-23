'use client';

import { useSyncExternalStore } from 'react';
import { slowRequests } from '../api/client';
import { Spinner } from '../components/ui';

/** Loader shown while any request is taking longer than expected (see SLOW_MS in api/client). */
export function SlowLoader() {
  const slow = useSyncExternalStore(slowRequests.subscribe, slowRequests.getSnapshot, () => false);
  if (!slow) return null;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[70]">
      <span className="sr-only">Loading…</span>
      <div aria-hidden="true" className="h-1 w-full overflow-hidden bg-primary-tint">
        <div className="h-full w-1/3 animate-loader-bar rounded-full bg-primary" />
      </div>
      <div aria-hidden="true" className="absolute right-4 top-3 rounded-full bg-surface-card p-2 text-primary shadow-l3">
        <Spinner />
      </div>
    </div>
  );
}
