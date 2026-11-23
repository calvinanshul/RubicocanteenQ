import { describe, expect, it } from 'vitest';
import { closedDateSchema, daysInclusive, exportRangeSchema, monthSchema, settingsSchema, userPatchSchema, usersQuerySchema } from '@/shared';

describe('Sprint 4 shared schemas', () => {
  it('counts export days inclusively', () => {
    expect(daysInclusive('2030-01-01', '2030-01-01')).toBe(1);
    expect(daysInclusive('2030-01-01', '2030-04-02')).toBe(92);
    expect(daysInclusive('2030-06-30', '2030-06-01')).toBeLessThan(1);
  });

  it('allows 1–92 days and refuses reversed or longer ranges', () => {
    expect(exportRangeSchema.safeParse({ from: '2030-01-01', to: '2030-04-02' }).success).toBe(true);
    const long = exportRangeSchema.safeParse({ from: '2030-01-01', to: '2030-04-03' });
    expect(long.success).toBe(false);
    expect(long.error?.issues[0]?.message).toBe('Date range must be 1–92 days');
    expect(exportRangeSchema.safeParse({ from: '2030-06-30', to: '2030-06-01' }).success).toBe(false);
  });

  it.each(['2030-00', '2030-13', '2030-1', '30-01', ''])('rejects month %j', (m) => {
    expect(monthSchema.safeParse(m).success).toBe(false);
  });

  it('user patch: valid subsets, null clears, unknown keys and bad values refused', () => {
    expect(userPatchSchema.parse({ employeeCode: ' EMP-1 ', department: null })).toEqual({ employeeCode: 'EMP-1', department: null });
    expect(userPatchSchema.safeParse({ role: 'OWNER' }).success).toBe(false);
    expect(userPatchSchema.safeParse({ isActive: 'no' }).success).toBe(false);
    expect(userPatchSchema.safeParse({ employeeCode: 'x' }).success).toBe(false);
    expect(userPatchSchema.safeParse({ passwordHash: 'x' }).success).toBe(false);
  });

  it('users query: page defaults to 1 and must be ≥ 1', () => {
    expect(usersQuerySchema.parse({}).page).toBe(1);
    expect(usersQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(usersQuerySchema.safeParse({ role: 'CHEF' }).success).toBe(false);
  });

  it('closed date needs a real date and a reason of at most 120 chars', () => {
    expect(closedDateSchema.safeParse({ date: '2030-02-30', reason: 'x' }).success).toBe(false);
    expect(closedDateSchema.safeParse({ date: '2030-02-03', reason: '' }).success).toBe(false);
    expect(closedDateSchema.safeParse({ date: '2030-02-03', reason: 'r'.repeat(121) }).success).toBe(false);
  });

  it('settings: US-05 AC2–AC4 messages', () => {
    const base = { orderCutoff: '11:00', slotStart: '12:30', slotEnd: '14:30', slotMinutes: 15, slotCapacity: 30, pickupLocation: 'Counter A', maxQtyPerItem: 5, allowedDomains: ['rubicotech.com'], closedWeekdays: [0, 6], noShowGraceMinutes: 30 };
    const msg = (o: object) => settingsSchema.safeParse({ ...base, ...o }).error?.issues[0]?.message;
    expect(msg({ slotStart: '14:00', slotEnd: '13:00' })).toBe('Pickup window end must be after start');
    expect(msg({ orderCutoff: '12:30', slotStart: '12:00' })).toBe('Cut-off must be before the first pickup slot');
    expect(msg({ slotMinutes: 7 })).toBe('Slot length must be 10, 15, 20 or 30 minutes');
  });
});
