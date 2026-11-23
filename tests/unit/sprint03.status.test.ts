/**
 * Sprint 03 acceptance scripts: order status machine (TC-U-07, BR7).
 * Contract: src/services/orderStatus.ts → canTransition(from, to): boolean, assertTransition(from, to) throws.
 */
import { describe, expect, it } from 'vitest';
import { ORDER_STATUSES, type OrderStatus } from '@/shared';
import { sprintActive } from '../sprintGate';

interface StatusContract {
  canTransition(from: OrderStatus, to: OrderStatus): boolean;
  assertTransition(from: OrderStatus, to: OrderStatus): void;
}
const MODULE = '../../src/server/services/orderStatus';
const load = async () => (await import(/* @vite-ignore */ MODULE)) as StatusContract;

/** BR7 + 05-architecture.md §4 (hand-over with warning allows PLACED/PREPARING → COLLECTED). */
const ALLOWED = new Set([
  'PLACED>PREPARING',
  'PLACED>CANCELLED',
  'PLACED>NO_SHOW',
  'PLACED>COLLECTED',
  'PREPARING>READY',
  'PREPARING>NO_SHOW',
  'PREPARING>COLLECTED',
  'READY>COLLECTED',
  'READY>NO_SHOW',
]);

const pairs = ORDER_STATUSES.flatMap((from) => ORDER_STATUSES.map((to) => [from, to] as const));

describe.skipIf(!sprintActive(3))('Sprint 03 · status machine (TC-U-07)', () => {
  it.each(pairs)('%s → %s', async (from, to) => {
    const m = await load();
    const allowed = ALLOWED.has(`${from}>${to}`);
    expect(m.canTransition(from, to)).toBe(allowed);
    if (allowed) expect(() => m.assertTransition(from, to)).not.toThrow();
    else expect(() => m.assertTransition(from, to)).toThrow();
  });
});
