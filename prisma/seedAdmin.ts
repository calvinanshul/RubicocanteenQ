import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { emailSchema, passwordSchema, PASSWORD_RULE_MESSAGE } from '@/shared';

export interface AdminSeedResult {
  status: 'skipped' | 'created' | 'promoted' | 'unchanged';
  email?: string;
}

const PLACEHOLDERS = new Set(['change-me', 'changeme', 'password', 'admin']);

/**
 * Create the first admin from ADMIN_EMAIL / ADMIN_PASSWORD (project .env). Used by `npm run db:seed` only.
 * - Neither set → skipped (local dev keeps the demo admin from the base seed).
 * - Account missing → created as an active ADMIN with a bcrypt-12 hash.
 * - Account exists → made an active ADMIN if needed; its password is never overwritten.
 */
export async function seedAdminFromEnv(
  prisma: PrismaClient,
  env: { ADMIN_EMAIL?: string; ADMIN_PASSWORD?: string; ADMIN_NAME?: string },
): Promise<AdminSeedResult> {
  const rawEmail = env.ADMIN_EMAIL?.trim();
  const password = env.ADMIN_PASSWORD;
  if (!rawEmail && !password) return { status: 'skipped' };
  if (!rawEmail || !password) throw new Error('Set both ADMIN_EMAIL and ADMIN_PASSWORD in .env (or neither).');

  const email = emailSchema.safeParse(rawEmail);
  if (!email.success) throw new Error(`ADMIN_EMAIL is not a valid email: ${rawEmail}`);
  if (PLACEHOLDERS.has(password.toLowerCase()) || !passwordSchema.safeParse(password).success) {
    throw new Error(`ADMIN_PASSWORD is a placeholder or too weak. ${PASSWORD_RULE_MESSAGE}.`);
  }

  const existing = await prisma.user.findUnique({ where: { email: email.data } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email: email.data,
        name: env.ADMIN_NAME?.trim() || 'Administrator',
        role: 'ADMIN',
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
    return { status: 'created', email: email.data };
  }
  if (existing.role !== 'ADMIN' || !existing.isActive) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN', isActive: true } });
    return { status: 'promoted', email: email.data };
  }
  return { status: 'unchanged', email: email.data };
}

const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/** "rubicotech.com, @RubicoTech.in" → ['rubicotech.com', 'rubicotech.in']. Empty → null; a bad domain throws. */
export function parseAllowedDomains(value: string | undefined): string[] | null {
  const raw = value?.trim();
  if (!raw) return null;
  const domains = [...new Set(raw.split(',').map((d) => d.trim().toLowerCase().replace(/^@/, '')).filter(Boolean))];
  const bad = domains.filter((d) => !DOMAIN_RE.test(d));
  if (domains.length === 0 || bad.length) {
    throw new Error(`ALLOWED_EMAIL_DOMAINS has invalid domain(s): ${bad.join(', ') || raw}. Use e.g. rubicotech.com,rubicotech.in`);
  }
  return domains;
}

/**
 * Sign-up email domains from ALLOWED_EMAIL_DOMAINS (project .env), e.g. "rubicotech.com,rubicotech.in".
 * Used by `npm run db:seed` only. Not set → settings unchanged. Replaces the list in the settings row.
 */
export async function seedAllowedDomainsFromEnv(
  prisma: PrismaClient,
  env: { ALLOWED_EMAIL_DOMAINS?: string },
): Promise<string[] | null> {
  const domains = parseAllowedDomains(env.ALLOWED_EMAIL_DOMAINS);
  if (!domains) return null;
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { allowedDomains: domains.join(',') },
    create: { id: 1, allowedDomains: domains.join(',') },
  });
  return domains;
}

export interface ProductionSeedResult {
  /** True only on the very first start, when the settings row did not exist yet. */
  settingsCreated: boolean;
  /** Domains written on first start, or null when settings already existed / none were given. */
  domains: string[] | null;
  admin: AdminSeedResult;
}

/**
 * Production bootstrap, run on every start of the Render service (the free plan has no shell or pre-deploy step).
 * Safe to repeat:
 * - Settings: created once with the defaults, plus ALLOWED_EMAIL_DOMAINS if given. Later starts never touch
 *   them, so changes made by an admin in Settings survive restarts.
 * - First admin from ADMIN_EMAIL / ADMIN_PASSWORD, as `seedAdminFromEnv` (an existing password is never changed;
 *   a demoted or disabled account with that email is made an active admin again).
 * - No demo users, dishes or menus.
 * Throws when no active admin would exist, so a fresh deploy can't come up without a way to log in.
 */
export async function seedProductionFromEnv(
  prisma: PrismaClient,
  env: { ADMIN_EMAIL?: string; ADMIN_PASSWORD?: string; ADMIN_NAME?: string; ALLOWED_EMAIL_DOMAINS?: string },
): Promise<ProductionSeedResult> {
  const domains = parseAllowedDomains(env.ALLOWED_EMAIL_DOMAINS); // validate before writing anything
  const existing = await prisma.settings.findUnique({ where: { id: 1 } });
  let settingsCreated = false;
  if (!existing) {
    await prisma.settings.create({ data: { id: 1, ...(domains ? { allowedDomains: domains.join(',') } : {}) } });
    settingsCreated = true;
  }

  const admin = await seedAdminFromEnv(prisma, env);
  if (admin.status === 'skipped' && (await prisma.user.count({ where: { role: 'ADMIN', isActive: true } })) === 0) {
    throw new Error('No active admin exists. Set ADMIN_EMAIL and ADMIN_PASSWORD for the first deploy.');
  }
  return { settingsCreated, domains: settingsCreated ? domains : null, admin };
}
