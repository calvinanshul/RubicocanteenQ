/** Cart logic (pure, unit-tested): one cart per menu date, quantities clamped to 1..max. */
export type Cart = Record<number, number>; // dailyMenuItemId → qty
export type Carts = Record<string, Cart>; // date → cart

export function setQty(carts: Carts, date: string, id: number, qty: number, max: number): Carts {
  const clamped = Math.max(0, Math.min(Math.floor(qty), Math.max(0, max)));
  const cart = { ...(carts[date] ?? {}) };
  if (clamped === 0) delete cart[id];
  else cart[id] = clamped;
  const next = { ...carts, [date]: cart };
  if (Object.keys(cart).length === 0) delete next[date];
  return next;
}

export function clearDate(carts: Carts, date: string): Carts {
  const next = { ...carts };
  delete next[date];
  return next;
}

/** Drop carts for dates before `today` (a cart never outlives its day). */
export function pruneOld(carts: Carts, today: string): Carts {
  return Object.fromEntries(Object.entries(carts).filter(([d]) => d >= today));
}

export interface PricedLine {
  id: number;
  name: string;
  qty: number;
  pricePaise: number;
}

/** Lines that are still on the menu, with prices; unknown ids are dropped. */
export function linesOf(cart: Cart | undefined, menu: { dailyMenuItemId: number; name: string; pricePaise: number }[]): PricedLine[] {
  if (!cart) return [];
  return menu
    .filter((m) => (cart[m.dailyMenuItemId] ?? 0) > 0)
    .map((m) => ({ id: m.dailyMenuItemId, name: m.name, qty: cart[m.dailyMenuItemId] ?? 0, pricePaise: m.pricePaise }));
}

export function totals(lines: PricedLine[]): { count: number; totalPaise: number } {
  return lines.reduce((acc, l) => ({ count: acc.count + l.qty, totalPaise: acc.totalPaise + l.qty * l.pricePaise }), { count: 0, totalPaise: 0 });
}
