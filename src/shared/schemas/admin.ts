import { z } from 'zod';
import { ROLES } from '../constants';
import { dateSchema } from './common';

/** Longest users search text (U1). The S14 search box stops at the same length. */
export const USER_SEARCH_MAX = 100;

/** U1 query: search text, role filter, page (≥ 1). */
export const usersQuerySchema = z.object({
  q: z.string().trim().max(USER_SEARCH_MAX).optional(),
  role: z.enum(ROLES, { errorMap: () => ({ message: 'Unknown role' }) }).optional(),
  page: z.coerce.number().int().min(1, 'Page must be 1 or more').max(100_000).default(1),
});
export type UsersQuery = z.infer<typeof usersQuerySchema>;

export const EMPLOYEE_CODE_MESSAGE = 'Employee ID must be 3–20 letters, digits or "-"';

/** U2 body: any subset. `null` clears the employee code or department. */
export const userPatchSchema = z
  .object({
    role: z.enum(ROLES, { errorMap: () => ({ message: 'Choose Employee, Staff, Manager or Admin' }) }).optional(),
    isActive: z.boolean({ invalid_type_error: 'Active must be true or false' }).optional(),
    employeeCode: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9-]{3,20}$/, EMPLOYEE_CODE_MESSAGE)
      .nullable()
      .optional(),
    department: z.string().trim().max(60, 'Department must be at most 60 characters').nullable().optional(),
  })
  .strict();
export type UserPatchInput = z.infer<typeof userPatchSchema>;

/** S4 body. */
export const closedDateSchema = z.object({
  date: dateSchema,
  reason: z.string().trim().min(1, 'Add a reason').max(120, 'Reason must be at most 120 characters'),
});
export type ClosedDateInput = z.infer<typeof closedDateSchema>;

/** S3 query. */
export const closedDatesQuerySchema = z.object({ from: dateSchema.optional(), to: dateSchema.optional() });

export const MAX_EXPORT_DAYS = 92;
export const RANGE_MESSAGE = `Date range must be 1–${MAX_EXPORT_DAYS} days`;

/** Inclusive number of days between two YYYY-MM-DD dates (1 for the same day). */
export function daysInclusive(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

/** R3 query: from ≤ to, at most 92 days inclusive (US-17 AC2). */
export const exportRangeSchema = z
  .object({ from: dateSchema, to: dateSchema })
  .superRefine((r, ctx) => {
    const days = daysInclusive(r.from, r.to);
    if (days < 1 || days > MAX_EXPORT_DAYS) ctx.addIssue({ code: 'custom', path: ['to'], message: RANGE_MESSAGE });
  });

/** R4 query: `YYYY-MM`. */
export const monthSchema = z
  .string({ required_error: 'Choose a month' })
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use the format YYYY-MM');
