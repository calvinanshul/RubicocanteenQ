import type { OrderStatus } from '@/shared';
import { AppError } from '../errors';

/**
 * BR7 order lifecycle (05-architecture.md §4). The direct →COLLECTED moves from PLACED/PREPARING are the
 * "hand over with a warning" path (US-13 AC8) and are only reachable through pickup verification (Q4).
 */
const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  PLACED: ['PREPARING', 'CANCELLED', 'NO_SHOW', 'COLLECTED'],
  PREPARING: ['READY', 'NO_SHOW', 'COLLECTED'],
  READY: ['COLLECTED', 'NO_SHOW'],
  COLLECTED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[from].includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new AppError('INVALID_TRANSITION', 409, `An order can't go from ${from} to ${to}`);
  }
}
