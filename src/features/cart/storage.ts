import { pruneOld, type Carts } from './cart';

/** sessionStorage key for the cart. The stored value records its owner so carts never pass between users. */
export const CART_KEY = 'cq_cart';

interface Stored {
  userId: number;
  carts: Carts;
}

function isStored(v: unknown): v is Stored {
  return typeof v === 'object' && v !== null && typeof (v as Stored).userId === 'number' && typeof (v as Stored).carts === 'object';
}

/** The stored carts for this user; anything stored by someone else (or malformed) is ignored. */
export function readCarts(userId: number | undefined, today: string): Carts {
  if (userId === undefined) return {};
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isStored(parsed) && parsed.userId === userId ? pruneOld(parsed.carts, today) : {};
  } catch {
    return {};
  }
}

export function writeCarts(userId: number | undefined, carts: Carts): void {
  if (userId === undefined) return;
  try {
    sessionStorage.setItem(CART_KEY, JSON.stringify({ userId, carts } satisfies Stored));
  } catch {
    /* storage unavailable (private mode): the cart still works for this page */
  }
}

/** Called on logout (BUG-02-001): the next person on this browser starts with an empty cart. */
export function clearCartStorage(): void {
  try {
    sessionStorage.removeItem(CART_KEY);
  } catch {
    /* nothing stored */
  }
}
