import { CART_KEY, clearCartStorage, readCarts, writeCarts } from './storage';

// Regression for BUG-02-001: a stored cart belongs to one user and is gone after logout.
describe('cart storage', () => {
  beforeEach(() => sessionStorage.clear());

  it("returns the owner's carts and ignores another user's", () => {
    writeCarts(7, { '2030-03-05': { 1: 2 } });
    expect(readCarts(7, '2030-03-05')).toEqual({ '2030-03-05': { 1: 2 } });
    expect(readCarts(8, '2030-03-05')).toEqual({});
    expect(readCarts(undefined, '2030-03-05')).toEqual({});
  });

  it('ignores the old unowned format and malformed data', () => {
    sessionStorage.setItem(CART_KEY, JSON.stringify({ '2030-03-05': { 1: 2 } }));
    expect(readCarts(7, '2030-03-05')).toEqual({});
    sessionStorage.setItem(CART_KEY, '{not json');
    expect(readCarts(7, '2030-03-05')).toEqual({});
  });

  it('drops past dates when reading', () => {
    writeCarts(7, { '2030-03-04': { 1: 1 }, '2030-03-05': { 2: 1 } });
    expect(Object.keys(readCarts(7, '2030-03-05'))).toEqual(['2030-03-05']);
  });

  it('clearCartStorage removes everything', () => {
    writeCarts(7, { '2030-03-05': { 1: 2 } });
    clearCartStorage();
    expect(sessionStorage.getItem(CART_KEY)).toBeNull();
  });
});
