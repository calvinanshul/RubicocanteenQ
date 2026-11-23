/** Money is always integer paise (A12). ₹1 = 100 paise. */

/** Parse a rupee amount ("120.50", 120.5) into paise. Throws on more than 2 decimals or invalid input. */
export function toPaise(rupees: string | number): number {
  const text = typeof rupees === 'number' ? String(rupees) : rupees.trim();
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) throw new Error(`Invalid rupee amount: "${text}"`);
  const [, sign, whole, frac = ''] = match;
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return sign === '-' ? -paise : paise;
}

/** Sum paise amounts, asserting every value is an integer. */
export function sumPaise(values: readonly number[]): number {
  return values.reduce((total, v) => {
    if (!Number.isInteger(v)) throw new Error(`Paise must be an integer, got ${v}`);
    return total + v;
  }, 0);
}

const groupFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Format paise as INR with Indian grouping: 1380000 → "₹13,800", 9999 → "₹99.99". */
export function formatINR(paise: number): string {
  if (!Number.isInteger(paise)) throw new Error(`Paise must be an integer, got ${paise}`);
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const rest = abs % 100;
  const whole = groupFormatter.format(rupees);
  return rest === 0 ? `${sign}₹${whole}` : `${sign}₹${whole}.${String(rest).padStart(2, '0')}`;
}
