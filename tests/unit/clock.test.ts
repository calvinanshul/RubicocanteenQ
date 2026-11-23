import { describe, expect, it } from 'vitest';
import { addDays, combineIST, toISTDate, weekdayOf } from '@/server/adapters/clock';
import { isClosedDay, isOrderingOpen, isPastDate } from '@/server/services/rules';

const settings = { orderCutoff: '11:00', closedWeekdays: [0, 6] };

describe('IST clock (TC-U-04)', () => {
  it('cut-off boundary at 05:30 UTC', () => {
    expect(isOrderingOpen('2026-11-17', new Date('2026-11-17T05:29:59Z'), settings)).toBe(true);
    expect(isOrderingOpen('2026-11-17', new Date('2026-11-17T05:30:00Z'), settings)).toBe(false);
  });
  it('"today" is the IST date near UTC midnight', () => {
    expect(toISTDate(new Date('2026-11-16T18:31:00Z'))).toBe('2026-11-17');
    expect(toISTDate(new Date('2026-11-16T18:29:00Z'))).toBe('2026-11-16');
  });
  it('combines IST date and time', () => {
    expect(combineIST('2026-11-17', '11:00').toISOString()).toBe('2026-11-17T05:30:00.000Z');
  });
  it('adds days across month ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  });
});

// TC-U-01 / TC-U-02 cut-off (BR1)
describe('isOrderingOpen (TC-U-01, TC-U-02)', () => {
  const ist = (s: string) => new Date(`${s}+05:30`);
  it('is open one second before cut-off', () => {
    expect(isOrderingOpen('2026-11-17', ist('2026-11-17T10:59:59'), settings)).toBe(true);
  });
  it('is closed exactly at cut-off', () => {
    expect(isOrderingOpen('2026-11-17', ist('2026-11-17T11:00:00'), settings)).toBe(false);
  });
});

describe('closed days and past dates', () => {
  it('treats weekends and holidays as closed', () => {
    expect(weekdayOf('2026-11-22')).toBe(0);
    expect(isClosedDay('2026-11-22', settings)).toBe(true);
    expect(isClosedDay('2026-11-21', settings)).toBe(true);
    expect(isClosedDay('2026-11-17', settings)).toBe(false);
    expect(isClosedDay('2026-11-17', settings, ['2026-11-17'])).toBe(true);
  });
  it('detects past dates in IST', () => {
    const now = new Date('2026-11-17T09:00:00+05:30');
    expect(isPastDate('2026-11-16', now)).toBe(true);
    expect(isPastDate('2026-11-17', now)).toBe(false);
  });
});
