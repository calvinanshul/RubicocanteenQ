import { describe, expect, it } from 'vitest';
import { formatINR, sumPaise, toPaise } from '@/shared/money';

// TC-U-09 Money in paise
describe('money helpers (TC-U-09)', () => {
  it('sums paise as integers without float drift', () => {
    expect(sumPaise([3333, 3333, 3333])).toBe(9999);
    expect(() => sumPaise([0.1, 0.2])).toThrow();
  });
  it('formats paise as INR', () => {
    expect(formatINR(9999)).toBe('₹99.99');
    expect(formatINR(12000)).toBe('₹120');
    expect(formatINR(1380000)).toBe('₹13,800');
    expect(formatINR(1234567805)).toBe('₹1,23,45,678.05');
    expect(formatINR(5)).toBe('₹0.05');
    expect(() => formatINR(1.5)).toThrow();
  });
  it('parses rupees into paise', () => {
    expect(toPaise('120.50')).toBe(12050);
    expect(toPaise('120')).toBe(12000);
    expect(toPaise('0.5')).toBe(50);
    expect(toPaise(99.99)).toBe(9999);
    expect(() => toPaise('10.999')).toThrow();
    expect(() => toPaise('abc')).toThrow();
    expect(() => toPaise('')).toThrow();
  });
});
