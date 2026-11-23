import { describe, expect, it } from 'vitest';
import {
  dailyMenuPutSchema,
  dateSchema,
  loginSchema,
  makeOrderSchema,
  makeSignupSchema,
  menuItemSchema,
  settingsSchema,
  zodFieldErrors,
} from '@/shared';

const signup = makeSignupSchema(['rubicotech.com']);

// TC-U-12 Sign-up schema
describe('sign-up schema (TC-U-12)', () => {
  it('rejects a non-company domain', () => {
    const r = signup.safeParse({ name: 'Priya', email: 'priya@gmail.com', password: 'Lunch2026' });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error).email).toBe('Use your company email (@rubicotech.com)');
  });
  it('rejects a weak password', () => {
    const r = signup.safeParse({ name: 'Priya', email: 'priya@rubicotech.com', password: 'abc' });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error).password).toMatch(/8–64 characters/);
  });
  it.each(['abcdefgh', '12345678', 'a1'.repeat(33)])('rejects password %s', (password) => {
    expect(signup.safeParse({ name: 'Priya', email: 'p@rubicotech.com', password }).success).toBe(false);
  });
  it('trims and lower-cases the email', () => {
    const r = signup.parse({ name: ' Priya Sharma ', email: '  Priya@Rubicotech.COM ', password: 'Lunch2026' });
    expect(r.email).toBe('priya@rubicotech.com');
    expect(r.name).toBe('Priya Sharma');
  });
  it('accepts every configured company domain and names them all in the error', () => {
    const both = makeSignupSchema(['rubicotech.com', 'rubicotech.in']);
    expect(both.safeParse({ name: 'Priya', email: 'priya@rubicotech.in', password: 'Lunch2026' }).success).toBe(true);
    expect(both.safeParse({ name: 'Priya', email: 'Priya@Rubicotech.IN', password: 'Lunch2026' }).success).toBe(true);
    const r = both.safeParse({ name: 'Priya', email: 'priya@gmail.com', password: 'Lunch2026' });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error).email).toBe('Use your company email (@rubicotech.com or @rubicotech.in)');
  });

  it('requires a 2–80 character name', () => {
    expect(signup.safeParse({ name: 'P', email: 'p@rubicotech.com', password: 'Lunch2026' }).success).toBe(false);
  });
  it('login schema normalises email', () => {
    expect(loginSchema.parse({ email: ' A@Rubicotech.com', password: 'x' }).email).toBe('a@rubicotech.com');
  });
});

// TC-U-11 Order schema validation
describe('order schema (TC-U-11)', () => {
  const order = makeOrderSchema(5);
  const base = { date: '2026-11-17', slotStart: '13:00' };
  it.each([
    [0, 'Quantity must be between 1 and 5'],
    [6, 'Quantity must be between 1 and 5'],
    [2.5, 'Quantity must be between 1 and 5'],
    ['a', 'Quantity must be between 1 and 5'],
  ])('rejects qty %s with a field message', (qty, message) => {
    const r = order.safeParse({ ...base, items: [{ dailyMenuItemId: 1, qty }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error)['items.0.qty']).toBe(message);
  });
  it('rejects an empty cart', () => {
    const r = order.safeParse({ ...base, items: [] });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error).items).toBe('Add at least one item');
  });
  it('rejects duplicate items', () => {
    const r = order.safeParse({ ...base, items: [{ dailyMenuItemId: 1, qty: 1 }, { dailyMenuItemId: 1, qty: 2 }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error)['items.1.dailyMenuItemId']).toBe('Duplicate item in order');
  });
  it('rejects a missing slot', () => {
    const r = order.safeParse({ date: '2026-11-17', items: [{ dailyMenuItemId: 1, qty: 1 }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error).slotStart).toBe('Choose a pickup slot');
  });
  it('accepts a valid order', () => {
    expect(order.safeParse({ ...base, items: [{ dailyMenuItemId: 1, qty: 5 }] }).success).toBe(true);
  });
});

// TC-U-15 Settings schema
describe('settings schema (TC-U-15)', () => {
  const valid = {
    orderCutoff: '11:00',
    slotStart: '12:30',
    slotEnd: '14:30',
    slotMinutes: 15,
    slotCapacity: 30,
    pickupLocation: 'Building 4 · Counter A',
    maxQtyPerItem: 5,
    allowedDomains: ['rubicotech.com'],
    closedWeekdays: [0, 6],
    noShowGraceMinutes: 30,
  };
  it('accepts valid settings', () => {
    expect(settingsSchema.safeParse(valid).success).toBe(true);
  });
  it('reports the three cross-field and slot errors', () => {
    const r = settingsSchema.safeParse({ ...valid, slotEnd: '12:00', orderCutoff: '12:30', slotMinutes: 7 });
    expect(r.success).toBe(false);
    if (!r.success) {
      const f = zodFieldErrors(r.error);
      expect(f.slotEnd).toBe('Pickup window end must be after start');
      expect(f.orderCutoff).toBe('Cut-off must be before the first pickup slot');
      expect(f.slotMinutes).toBe('Slot length must be 10, 15, 20 or 30 minutes');
    }
  });
});

describe('menu schemas', () => {
  it.each([0, -5, 'abc', 100001, 12.5])('rejects price %s', (pricePaise) => {
    const r = menuItemSchema.safeParse({ name: 'X', category: 'MAIN', diet: 'VEG', pricePaise });
    expect(r.success).toBe(false);
  });
  it('accepts the new COMBO and LIGHT categories', () => {
    for (const category of ['COMBO', 'LIGHT']) {
      expect(menuItemSchema.safeParse({ name: 'X', category, diet: 'VEG', pricePaise: 8000 }).success).toBe(true);
    }
  });
  it.each([0, -1, 1.5, 1001])('daily menu rejects quantity %s', (quantity) => {
    expect(dailyMenuPutSchema.safeParse({ entries: [{ menuItemId: 1, quantity }] }).success).toBe(false);
  });
  it('daily menu rejects duplicates', () => {
    const r = dailyMenuPutSchema.safeParse({ entries: [{ menuItemId: 1, quantity: 5 }, { menuItemId: 1, quantity: 6 }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error)['entries.1.menuItemId']).toBe('Duplicate item in menu');
  });
  it('date schema rejects impossible dates', () => {
    expect(dateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(dateSchema.safeParse('2026-11-17').success).toBe(true);
    expect(dateSchema.safeParse('17-11-2026').success).toBe(false);
  });
});
