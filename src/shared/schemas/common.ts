import { z } from 'zod';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** `YYYY-MM-DD` that is a real calendar date. */
export const dateSchema = z
  .string({ required_error: 'Date is required' })
  .regex(DATE_RE, 'Use the format YYYY-MM-DD')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, 'Not a valid calendar date');

/** `HH:mm` (24 h). */
export const timeSchema = z.string().regex(TIME_RE, 'Use the format HH:mm');

export const idSchema = z.coerce.number().int().positive();

export function minutesOf(hhmm: string): number {
  const [h = '0', m = '0'] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

/** Flatten a ZodError into `{ "items.0.qty": "message" }` (first message per path). */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}
