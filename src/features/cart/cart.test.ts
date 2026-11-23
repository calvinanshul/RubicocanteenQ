import { clearDate, linesOf, pruneOld, setQty, totals, type Carts } from './cart';

// AC 04-1: cart rules
describe('cart', () => {
  const menu = [
    { dailyMenuItemId: 1, name: 'Veg Biryani', pricePaise: 12000 },
    { dailyMenuItemId: 2, name: 'Masala Chaas', pricePaise: 2500 },
  ];

  it('adds, updates and removes quantities per date', () => {
    let c: Carts = {};
    c = setQty(c, '2030-03-05', 1, 2, 5);
    c = setQty(c, '2030-03-06', 2, 1, 5);
    expect(c).toEqual({ '2030-03-05': { 1: 2 }, '2030-03-06': { 2: 1 } });
    c = setQty(c, '2030-03-05', 1, 0, 5);
    expect(c['2030-03-05']).toBeUndefined();
  });

  it.each([
    [6, 5, 5],
    [4, 3, 3],
    [-1, 5, 0],
    [2.7, 5, 2],
  ])('clamps %s to max %s → %s', (qty, max, expected) => {
    expect(setQty({}, 'd', 1, qty, max).d?.[1] ?? 0).toBe(expected);
  });

  it('prices lines from the menu, skipping dishes no longer on it', () => {
    const lines = linesOf({ 1: 2, 2: 3, 99: 1 }, menu);
    expect(lines.map((l) => l.id)).toEqual([1, 2]);
    expect(totals(lines)).toEqual({ count: 5, totalPaise: 2 * 12000 + 3 * 2500 });
  });

  it('clears one date and prunes past dates', () => {
    const c: Carts = { '2030-03-04': { 1: 1 }, '2030-03-05': { 1: 1 }, '2030-03-06': { 2: 1 } };
    expect(Object.keys(clearDate(c, '2030-03-05'))).toEqual(['2030-03-04', '2030-03-06']);
    expect(Object.keys(pruneOld(c, '2030-03-05'))).toEqual(['2030-03-05', '2030-03-06']);
  });
});
