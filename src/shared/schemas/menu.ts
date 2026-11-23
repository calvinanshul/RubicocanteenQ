import { z } from 'zod';
import { CATEGORIES, DIETS } from '../constants';

export const PRICE_MESSAGE = 'Price must be between ₹1 and ₹1,000 with at most 2 decimals';

export const menuItemSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name must be at most 80 characters'),
  description: z.string().trim().max(300, 'Description must be at most 300 characters').optional(),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Choose a valid category' }) }),
  pricePaise: z
    .number({ invalid_type_error: PRICE_MESSAGE, required_error: PRICE_MESSAGE })
    .int(PRICE_MESSAGE)
    .min(100, PRICE_MESSAGE)
    .max(100000, PRICE_MESSAGE),
  diet: z.enum(DIETS, { errorMap: () => ({ message: 'Choose Veg, Non-veg or Jain' }) }),
});
export type MenuItemInput = z.infer<typeof menuItemSchema>;

export const menuItemPatchSchema = menuItemSchema.partial().extend({ isActive: z.boolean().optional() });

export const QUANTITY_MESSAGE = 'Quantity must be a whole number from 1 to 1000';

export const dailyMenuEntrySchema = z.object({
  menuItemId: z.number().int().positive(),
  quantity: z
    .number({ invalid_type_error: QUANTITY_MESSAGE, required_error: QUANTITY_MESSAGE })
    .int(QUANTITY_MESSAGE)
    .min(1, QUANTITY_MESSAGE)
    .max(1000, QUANTITY_MESSAGE),
});

export const dailyMenuPutSchema = z.object({
  entries: z
    .array(dailyMenuEntrySchema)
    .min(1, 'Add at least one dish to the menu')
    .max(100)
    .superRefine((entries, ctx) => {
      const seen = new Set<number>();
      entries.forEach((e, i) => {
        if (seen.has(e.menuItemId)) {
          ctx.addIssue({ code: 'custom', path: [i, 'menuItemId'], message: 'Duplicate item in menu' });
        }
        seen.add(e.menuItemId);
      });
    }),
});
export type DailyMenuPutInput = z.infer<typeof dailyMenuPutSchema>;
