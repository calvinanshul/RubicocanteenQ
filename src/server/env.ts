import { AsyncLocalStorage } from 'node:async_hooks';
import { z } from 'zod';

/** An optional setting where an empty value (`KEY=` in .env) means "not set". */
const optionalString = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional());

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DIRECT_URL: z.string().optional(),
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
    ENABLE_TEST_CLOCK: z
      .enum(['true', 'false', ''])
      .optional()
      .transform((v) => v === 'true'),
    APP_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    /** Public origin of the site (links in emails). */
    WEB_ORIGIN: z.string().default('http://localhost:3000'),
    LOG_LEVEL: z.string().optional(),
    /** Bearer token for POST /api/cron/no-show (X2). Unset = the endpoint always answers 401. */
    CRON_SECRET: z.string().min(16, 'CRON_SECRET must be at least 16 characters').optional().or(z.literal('').transform(() => undefined)),
    /**
     * Where outgoing email goes. `none` = not sent (tests), `ethereal` = Ethereal's fake inbox (nothing is delivered;
     * each email gets a preview link in the log), `smtp` = a real SMTP server (SMTP_*).
     */
    MAIL_TRANSPORT: z.enum(['none', 'ethereal', 'smtp']).default('none'),
    MAIL_FROM: z.string().min(3).default('CanteenQ <no-reply@canteenq.local>'),
    /** Ethereal account. Leave empty to create a throwaway account on the first email (its login is logged). */
    ETHEREAL_USER: optionalString,
    ETHEREAL_PASS: optionalString,
    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,
  })
  .superRefine((env, ctx) => {
    // BE-72: the test clock must never be enabled in production (TC-API-SYS-02)
    if (env.ENABLE_TEST_CLOCK && env.APP_ENV === 'production') {
      ctx.addIssue({
        code: 'custom',
        path: ['ENABLE_TEST_CLOCK'],
        message: 'ENABLE_TEST_CLOCK must not be true when APP_ENV=production',
      });
    }
    if (env.MAIL_TRANSPORT === 'smtp' && !env.SMTP_HOST) {
      ctx.addIssue({ code: 'custom', path: ['SMTP_HOST'], message: 'SMTP_HOST is required when MAIL_TRANSPORT=smtp' });
    }
    if (Boolean(env.ETHEREAL_USER) !== Boolean(env.ETHEREAL_PASS)) {
      ctx.addIssue({ code: 'custom', path: ['ETHEREAL_PASS'], message: 'Set both ETHEREAL_USER and ETHEREAL_PASS, or neither' });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Parse and validate environment variables. Throws with a readable message on failure. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  // On Render the public URL is provided as RENDER_EXTERNAL_URL; use it as the web origin unless set explicitly.
  const withDefaults = { ...source, WEB_ORIGIN: source.WEB_ORIGIN || source.RENDER_EXTERNAL_URL || undefined };
  const result = envSchema.safeParse(withDefaults);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  return result.data;
}

let cached: Env | undefined;
const override = new AsyncLocalStorage<Env>();

/** The validated configuration (parsed from process.env once). */
export function env(): Env {
  const scoped = override.getStore();
  if (scoped) return scoped;
  cached ??= parseEnv(process.env);
  return cached;
}

/** Tests: run `fn` with a different configuration (e.g. a production-like app with the test clock off). */
export function runWithEnv<T>(config: Env, fn: () => T): T {
  return override.run(config, fn);
}
