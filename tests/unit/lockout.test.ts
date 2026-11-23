import { describe, expect, it } from 'vitest';
import { isLocked, registerFailure, registerSuccess, type LockoutState } from '@/server/auth/lockout';

const t0 = new Date('2026-11-17T04:00:00Z');
const at = (min: number) => new Date(t0.getTime() + min * 60_000);
const fresh: LockoutState = { failedLoginCount: 0, failedLoginWindowStart: null, lockedUntil: null };

function fail(times: number, start: LockoutState = fresh, minuteStep = 1): LockoutState {
  let s = start;
  for (let i = 0; i < times; i++) s = registerFailure(s, at(i * minuteStep));
  return s;
}

// TC-U-14 Login lockout (US-02 AC3, BR11)
describe('login lockout (TC-U-14)', () => {
  it('is not locked after 4 failures', () => {
    expect(isLocked(fail(4), at(4))).toBe(false);
  });
  it('locks after 5 failures within 15 minutes', () => {
    const s = fail(5);
    expect(isLocked(s, at(5))).toBe(true);
    expect(isLocked(s, at(18))).toBe(true);
  });
  it('unlocks 15 minutes after the lock', () => {
    const s = fail(5); // 5th failure at minute 4 → locked until minute 19
    expect(isLocked(s, at(20))).toBe(false);
  });
  it('does not count failures spread over more than 15 minutes', () => {
    const s = fail(5, fresh, 4); // minutes 0,4,8,12,16 → window resets at 16
    expect(isLocked(s, at(16))).toBe(false);
  });
  it('a successful login resets the counter', () => {
    const s = registerFailure(registerSuccess(), at(1));
    expect(fail(4).failedLoginCount).toBe(4);
    expect(s.failedLoginCount).toBe(1);
    expect(registerSuccess()).toEqual(fresh);
  });
});
