/**
 * Sprint 02 acceptance scripts: ordering rules (TC-U-01..06, TC-U-10).
 * Contract (docs/test-cases/contracts.md §Sprint 02):
 *   src/services/rules.ts      → isOrderingOpen, isValidOrderDate, generateSlots, isValidSlot, isClosedDay
 *   src/services/pickupCode.ts → generatePickupCode()
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sprintActive } from '../sprintGate';

interface SlotSettings {
  slotStart: string;
  slotEnd: string;
  slotMinutes: number;
}
interface RulesContract {
  isOrderingOpen(date: string, now: Date, s: { orderCutoff: string }): boolean;
  isValidOrderDate(date: string, now: Date): boolean;
  generateSlots(s: SlotSettings): { start: string; end: string }[];
  isValidSlot(slotStart: string, s: SlotSettings): boolean;
}
interface PickupCodeContract {
  generatePickupCode(): string;
}

const RULES = '../../src/server/services/rules';
const PICKUP = '../../src/server/services/pickupCode';
const rules = async () => (await import(/* @vite-ignore */ RULES)) as RulesContract;
const pickup = async () => (await import(/* @vite-ignore */ PICKUP)) as PickupCodeContract;

const ist = (s: string) => new Date(`${s}+05:30`);
const window15 = { slotStart: '12:30', slotEnd: '14:30', slotMinutes: 15 };

describe.skipIf(!sprintActive(2))('Sprint 02 · ordering rules', () => {
  it('TC-U-01 ordering is open one second before the cut-off', async () => {
    const r = await rules();
    expect(r.isOrderingOpen('2026-11-17', ist('2026-11-17T10:59:59'), { orderCutoff: '11:00' })).toBe(true);
  });

  it('TC-U-02 ordering is closed exactly at the cut-off', async () => {
    const r = await rules();
    expect(r.isOrderingOpen('2026-11-17', ist('2026-11-17T11:00:00'), { orderCutoff: '11:00' })).toBe(false);
  });

  it('TC-U-03 order dates: today and tomorrow only', async () => {
    const r = await rules();
    const now = ist('2026-11-16T23:00:00');
    expect(r.isOrderingOpen('2026-11-16', now, { orderCutoff: '11:00' })).toBe(false);
    expect(r.isValidOrderDate('2026-11-16', now)).toBe(true);
    expect(r.isValidOrderDate('2026-11-17', now)).toBe(true);
    expect(r.isValidOrderDate('2026-11-18', now)).toBe(false);
    expect(r.isValidOrderDate('2026-11-15', now)).toBe(false);
  });

  it('TC-U-04 the IST/UTC boundary decides "today"', async () => {
    const r = await rules();
    expect(r.isOrderingOpen('2026-11-17', new Date('2026-11-17T05:29:59Z'), { orderCutoff: '11:00' })).toBe(true);
    expect(r.isOrderingOpen('2026-11-17', new Date('2026-11-17T05:30:00Z'), { orderCutoff: '11:00' })).toBe(false);
    // 18:31 UTC on the 16th is 00:01 IST on the 17th: the 18th is "tomorrow", the 16th is in the past
    expect(r.isValidOrderDate('2026-11-18', new Date('2026-11-16T18:31:00Z'))).toBe(true);
    expect(r.isValidOrderDate('2026-11-16', new Date('2026-11-16T18:31:00Z'))).toBe(false);
  });

  it('TC-U-05 slot generation for 12:30–14:30 every 15 min', async () => {
    const r = await rules();
    const slots = r.generateSlots(window15);
    expect(slots).toHaveLength(8);
    expect(slots[0]).toEqual({ start: '12:30', end: '12:45' });
    expect(slots[7]).toEqual({ start: '14:15', end: '14:30' });
  });

  it.each([
    [10, 12],
    [20, 6],
    [30, 4],
  ])('EC-02-U1 slot length %i min gives %i slots', async (slotMinutes, count) => {
    const r = await rules();
    expect(r.generateSlots({ ...window15, slotMinutes })).toHaveLength(count);
  });

  it('EC-02-U2 a window that does not divide evenly drops the partial last slot', async () => {
    const r = await rules();
    const slots = r.generateSlots({ slotStart: '12:30', slotEnd: '13:40', slotMinutes: 30 });
    expect(slots.map((s) => s.start)).toEqual(['12:30', '13:00']);
  });

  it.each([
    ['12:10', false],
    ['14:30', false],
    ['12:15', false],
    ['13:00', true],
    ['12:30', true],
    ['14:15', true],
    ['13:0', false],
    ['25:00', false],
  ])('TC-U-06 slot %s valid = %s', async (slot, valid) => {
    const r = await rules();
    expect(r.isValidSlot(slot, window15)).toBe(valid);
  });

  it('TC-U-10 pickup codes: 6 chars from the safe alphabet, generated with crypto.randomInt', async () => {
    const p = await pickup();
    const codes = Array.from({ length: 5000 }, () => p.generatePickupCode());
    for (const c of codes) expect(c).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(new Set(codes).size).toBeGreaterThan(4990); // 32^6 space: collisions are vanishingly rare
    const src = readFileSync(new URL('../../src/server/services/pickupCode.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/randomInt/);
    expect(src).not.toMatch(/Math\.random/);
  });
});
