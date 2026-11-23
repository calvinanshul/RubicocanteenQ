/** BR11: 5 failed logins within 15 minutes → locked for 15 minutes. Pure functions (TC-U-14). */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_WINDOW_MS = 15 * 60 * 1000;
export const LOCK_DURATION_MS = 15 * 60 * 1000;

export interface LockoutState {
  failedLoginCount: number;
  failedLoginWindowStart: Date | null;
  lockedUntil: Date | null;
}

export function isLocked(state: LockoutState, now: Date): boolean {
  return state.lockedUntil !== null && state.lockedUntil.getTime() > now.getTime();
}

/** New state after one more failed attempt. */
export function registerFailure(state: LockoutState, now: Date): LockoutState {
  const windowExpired =
    state.failedLoginWindowStart === null || now.getTime() - state.failedLoginWindowStart.getTime() > LOCK_WINDOW_MS;
  const count = windowExpired ? 1 : state.failedLoginCount + 1;
  const windowStart = windowExpired ? now : state.failedLoginWindowStart;
  if (count >= MAX_FAILED_ATTEMPTS) {
    return { failedLoginCount: 0, failedLoginWindowStart: null, lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS) };
  }
  return { failedLoginCount: count, failedLoginWindowStart: windowStart, lockedUntil: state.lockedUntil };
}

/** State after a successful login. */
export function registerSuccess(): LockoutState {
  return { failedLoginCount: 0, failedLoginWindowStart: null, lockedUntil: null };
}
