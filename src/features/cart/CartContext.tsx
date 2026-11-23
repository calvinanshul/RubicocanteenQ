'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { addDays, todayIST } from '../../lib/format';
import { useMe } from '../../api/hooks';
import { clearDate, setQty, type Cart, type Carts } from './cart';
import { readCarts, writeCarts } from './storage';

interface CartApi {
  cartFor: (date: string) => Cart;
  setQty: (date: string, id: number, qty: number, max: number) => void;
  clear: (date: string) => void;
}
const CartContext = createContext<CartApi | null>(null);

/**
 * Cart in React state, mirrored to sessionStorage so a reload keeps it (FE-42). The stored cart belongs to
 * the logged-in user and is removed on logout, so it never carries over to someone else (BUG-02-001).
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const userId = useMe().data?.user?.id;
  const [carts, setCarts] = useState<Carts>(() => readCarts(userId, addDays(todayIST(), -1)));
  useEffect(() => writeCarts(userId, carts), [userId, carts]);
  const update = useCallback((date: string, id: number, qty: number, max: number) => setCarts((c) => setQty(c, date, id, qty, max)), []);
  const clear = useCallback((date: string) => setCarts((c) => clearDate(c, date)), []);
  const value = useMemo<CartApi>(() => ({ cartFor: (d) => carts[d] ?? {}, setQty: update, clear }), [carts, update, clear]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
