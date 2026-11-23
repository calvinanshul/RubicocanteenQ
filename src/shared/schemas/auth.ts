import { z } from 'zod';

export const PASSWORD_RULE_MESSAGE = 'Password must be 8–64 characters with at least one letter and one number';

export const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .email('Enter a valid email address');

export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, PASSWORD_RULE_MESSAGE)
  .max(64, PASSWORD_RULE_MESSAGE)
  .regex(/[A-Za-z]/, PASSWORD_RULE_MESSAGE)
  .regex(/\d/, PASSWORD_RULE_MESSAGE);

/** Individual password rules for the live checklist on S2. */
export const PASSWORD_RULES = [
  { id: 'length', label: '8–64 characters', test: (p: string) => p.length >= 8 && p.length <= 64 },
  { id: 'letter', label: 'At least one letter', test: (p: string) => /[A-Za-z]/.test(p) },
  { id: 'number', label: 'At least one number', test: (p: string) => /\d/.test(p) },
] as const;

export const personNameSchema = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(2, 'Name must be 2–80 characters')
  .max(80, 'Name must be 2–80 characters');

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf('@') + 1).toLowerCase();
}

export function domainMessage(allowedDomains: readonly string[]): string {
  return `Use your company email (${allowedDomains.map((d) => `@${d}`).join(' or ')})`;
}

/** Sign-up body without the domain rule. The API uses this and returns 403 DOMAIN_NOT_ALLOWED itself. */
export const signupBaseSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

/** Sign-up body with the company-domain rule (A1). The allowed domains come from settings. */
export function makeSignupSchema(allowedDomains: readonly string[]) {
  const domains = allowedDomains.map((d) => d.trim().toLowerCase()).filter(Boolean);
  return signupBaseSchema.extend({
    email: emailSchema.refine((e) => domains.includes(emailDomain(e)), domainMessage(domains)),
  });
}
export type SignupInput = z.infer<typeof signupBaseSchema>;

/** Sign-up form adds a confirm field (client only). */
export function makeSignupFormSchema(allowedDomains: readonly string[]) {
  return makeSignupSchema(allowedDomains)
    .extend({ confirmPassword: z.string().min(1, 'Confirm your password') })
    .refine((v) => v.password === v.confirmPassword, {
      path: ['confirmPassword'],
      message: 'Passwords do not match',
    });
}

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;
