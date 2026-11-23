/**
 * RFC 4180 CSV writer with formula-injection protection (US-17 AC3, OWASP "CSV injection").
 * A text cell that starts with = + - @ (optionally after a tab or carriage return) gets a leading
 * apostrophe so spreadsheet apps show it as text instead of running it.
 */
const FORMULA_START = /^[\t\r]*[=+\-@]/;

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return FORMULA_START.test(text) ? `'${text}` : text;
}

function quote(text: string): string {
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Header row (the column names, in order) followed by one line per row. Lines end with CRLF. */
export function toCSV(rows: readonly Record<string, unknown>[], columns: readonly string[]): string {
  const lines = [columns.map((c) => quote(c)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => quote(cellText(row[c]))).join(','));
  return `${lines.join('\r\n')}\r\n`;
}
