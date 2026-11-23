import { useEffect, useState } from 'react';
import { useServerTime } from '../api/hooks';
import { todayIST } from './format';

/**
 * Server time, estimated from the last response's `serverTime` (never the device clock, BR1).
 * `receivedAt` is when that response arrived (TanStack Query's dataUpdatedAt). Re-renders every `tickMs`.
 */
export function useServerNow(serverTime: string | undefined, receivedAt: number, tickMs = 15_000): Date | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), tickMs);
    return () => clearInterval(t);
  }, [tickMs]);
  if (!serverTime) return null;
  const offset = Date.parse(serverTime) - receivedAt;
  return new Date(Date.now() + offset);
}

/** The instant of an IST date + HH:mm. */
export function istInstant(date: string, hhmm: string): Date {
  return new Date(`${date}T${hhmm}:00+05:30`);
}

/** "42 min left", "1 h 05 min left". */
export function formatLeft(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 60_000));
  if (total < 60) return `${total} min left`;
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')} min left`;
}

/** "In 18 mins", "In 2 h 05 mins", "Now". */
export function formatIn(ms: number): string {
  const total = Math.ceil(ms / 60_000);
  if (total <= 0) return 'Now';
  if (total < 60) return `In ${total} min${total === 1 ? '' : 's'}`;
  return `In ${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')} mins`;
}

/** IST wall-clock "HH:mm" for an ISO instant. */
export function timeIST(iso: string): string {
  return new Date(Date.parse(iso) + 330 * 60_000).toISOString().slice(11, 16);
}

/**
 * The server's "now" and "today" (IST), kept moving with the device's elapsed time, so the UI never takes the
 * date or the cut-off from a wrong device clock (BR1, BUG-03-001). `today` is null until the server has answered.
 */
export function useServerClock(tickMs = 30_000): { now: Date | null; today: string | null; error: boolean; retry: () => void } {
  const time = useServerTime();
  const now = useServerNow(time.data?.serverTime, time.dataUpdatedAt, tickMs);
  return {
    now,
    today: now ? todayIST(now) : null,
    // Exposed so screens that wait for the date can show an error + retry instead of loading forever (BUG-03-002)
    error: time.isError && !now,
    retry: () => void time.refetch(),
  };
}
