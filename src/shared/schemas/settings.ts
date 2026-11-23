import { z } from 'zod';
import { SLOT_MINUTES_OPTIONS } from '../constants';
import { minutesOf, timeSchema } from './common';

export const settingsSchema = z
  .object({
    orderCutoff: timeSchema,
    slotStart: timeSchema,
    slotEnd: timeSchema,
    slotMinutes: z
      .number()
      .int()
      .refine((n) => (SLOT_MINUTES_OPTIONS as readonly number[]).includes(n), {
        message: 'Slot length must be 10, 15, 20 or 30 minutes',
      }),
    slotCapacity: z.number().int().min(1, 'Capacity must be 1–500').max(500, 'Capacity must be 1–500'),
    pickupLocation: z.string().trim().min(1, 'Pickup location is required').max(80, 'Max 80 characters'),
    maxQtyPerItem: z.number().int().min(1).max(10),
    allowedDomains: z
      .array(z.string().trim().toLowerCase().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Enter a valid domain'))
      .min(1, 'At least one domain is required'),
    closedWeekdays: z.array(z.number().int().min(0).max(6)),
    noShowGraceMinutes: z.number().int().min(0).max(240),
  })
  .superRefine((s, ctx) => {
    if (minutesOf(s.slotEnd) <= minutesOf(s.slotStart)) {
      ctx.addIssue({ code: 'custom', path: ['slotEnd'], message: 'Pickup window end must be after start' });
    }
    if (minutesOf(s.orderCutoff) >= minutesOf(s.slotStart)) {
      ctx.addIssue({
        code: 'custom',
        path: ['orderCutoff'],
        message: 'Cut-off must be before the first pickup slot',
      });
    }
  });
export type SettingsInput = z.infer<typeof settingsSchema>;
