'use client';

import { useSyncExternalStore } from 'react';
import { slowRequests } from '../api/client';
import { Spinner } from '../components/ui';

/** "Waking up the server…" when a request takes over 3 s (free API host sleeps, NFR7). */
export function SlowBanner() {
  const slow = useSyncExternalStore(slowRequests.subscribe, slowRequests.getSnapshot, () => false);
  if (!slow) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 bg-warning-bg px-4 py-2 text-label-lg text-warning-text shadow-l1">
      <Spinner /> Waking up the server…
    </div>
  );
}
