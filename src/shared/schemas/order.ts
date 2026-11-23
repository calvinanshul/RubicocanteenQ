import { z } from 'zod';
import { TIME_RE, dateSchema } from './common';

/** Order body (O1). `maxQtyPerItem` comes from settings. */
export function makeOrderSchema(maxQtyPerItem = 5) {
  const qtyMessage = `Quantity must be between 1 and ${maxQtyPerItem}`;
  return z.object({
    date: dateSchema,
    slotStart: z.string({ required_error: 'Choose a pickup slot' }).regex(TIME_RE, 'Choose a valid pickup slot'),
    items: z
      .array(
        z.object({
          dailyMenuItemId: z.number().int().positive(),
          qty: z
            .number({ invalid_type_error: qtyMessage, required_error: qtyMessage })
            .int(qtyMessage)
            .min(1, qtyMessage)
            .max(maxQtyPerItem, qtyMessage),
        }),
      )
      .min(1, 'Add at least one item')
      .max(10, 'At most 10 different items per order')
      .superRefine((items, ctx) => {
        const seen = new Set<number>();
        items.forEach((it, i) => {
          if (seen.has(it.dailyMenuItemId)) {
            ctx.addIssue({ code: 'custom', path: [i, 'dailyMenuItemId'], message: 'Duplicate item in order' });
          }
          seen.add(it.dailyMenuItemId);
        });
      }),
  });
}
export type OrderInput = z.infer<ReturnType<typeof makeOrderSchema>>;

/** Q3: pickup code, trimmed and upper-cased, from the look-alike-free alphabet (BR8). */
export const pickupCodeSchema = z
  .string({ required_error: 'Enter the 6-character code' })
  .trim()
  .toUpperCase()
  .regex(/^[A-HJ-NP-Z2-9]{6}$/, 'Enter the 6-character code');

/** Q2: staff may set PREPARING, READY or NO_SHOW (COLLECTED only through pickup verification). */
export const statusChangeSchema = z.object({
  status: z.enum(['PREPARING', 'READY', 'NO_SHOW'], { errorMap: () => ({ message: 'Status must be PREPARING, READY or NO_SHOW' }) }),
});
