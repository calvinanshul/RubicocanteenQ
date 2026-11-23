/**
 * Sprint 04 acceptance scripts: CSV adapter (TC-U-13, US-17 AC3).
 * Contract: src/adapters/csv.ts → toCSV(rows: Record<string, unknown>[], columns: string[]): string
 */
import { describe, expect, it } from 'vitest';
import { sprintActive } from '../sprintGate';

interface CsvContract {
  toCSV(rows: Record<string, unknown>[], columns: string[]): string;
}
const MODULE = '../../src/server/adapters/csv';
const load = async () => (await import(/* @vite-ignore */ MODULE)) as CsvContract;

const cell = (csv: string) => csv.split(/\r?\n/)[1] ?? '';

describe.skipIf(!sprintActive(4))('Sprint 04 · CSV escaping (TC-U-13)', () => {
  it.each([
    ['=SUM(A1)', "'=SUM(A1)"],
    ['+1', "'+1"],
    ['-1', "'-1"],
    ['@x', "'@x"],
    ['a,"b"', '"a,""b"""'],
    ['line1\nline2', '"line1\nline2"'],
    ['plain', 'plain'],
  ])('escapes %j', async (value, expected) => {
    const { toCSV } = await load();
    const csv = toCSV([{ v: value }], ['v']);
    expect(csv.startsWith('v')).toBe(true);
    expect(csv.slice(csv.indexOf('\n') + 1).replace(/\r?\n$/, '')).toBe(expected);
  });

  it('EC-04-U1 tab and carriage-return prefixes are neutralised too', async () => {
    const { toCSV } = await load();
    expect(cell(toCSV([{ v: '\t=1' }], ['v']))).toMatch(/^'|^"'/);
  });

  it('EC-04-U2 numbers and empty values are written plainly', async () => {
    const { toCSV } = await load();
    const csv = toCSV([{ a: 120, b: null, c: undefined }], ['a', 'b', 'c']);
    expect(cell(csv)).toBe('120,,');
  });

  it('EC-04-U3 the header row follows the column order given', async () => {
    const { toCSV } = await load();
    expect(toCSV([], ['date', 'order_id']).split(/\r?\n/)[0]).toBe('date,order_id');
  });
});
