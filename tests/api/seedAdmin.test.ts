import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { seedAdminFromEnv, seedAllowedDomainsFromEnv } from '../../prisma/seedAdmin';
import { app, createUser, prisma, uniqueEmail } from './helpers';

describe('first admin from .env (seedAdminFromEnv)', () => {
  it('does nothing when neither value is set', async () => {
    expect(await seedAdminFromEnv(prisma, {})).toEqual({ status: 'skipped' });
  });

  it('creates an active admin who can log in, with a bcrypt-12 hash', async () => {
    const email = uniqueEmail('owner');
    const res = await seedAdminFromEnv(prisma, { ADMIN_EMAIL: ` ${email.toUpperCase()} `, ADMIN_PASSWORD: 'Str0ngAdmin!' });
    expect(res).toEqual({ status: 'created', email });
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user).toMatchObject({ role: 'ADMIN', isActive: true });
    expect(user.passwordHash.startsWith('$2b$12$')).toBe(true);
    const login = await request(app).post('/api/auth/login').send({ email, password: 'Str0ngAdmin!' });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('ADMIN');
  });

  it('is idempotent and never overwrites an existing password', async () => {
    const email = uniqueEmail('owner');
    await seedAdminFromEnv(prisma, { ADMIN_EMAIL: email, ADMIN_PASSWORD: 'Str0ngAdmin!' });
    const again = await seedAdminFromEnv(prisma, { ADMIN_EMAIL: email, ADMIN_PASSWORD: 'Different99' });
    expect(again.status).toBe('unchanged');
    expect((await request(app).post('/api/auth/login').send({ email, password: 'Str0ngAdmin!' })).status).toBe(200);
  });

  it('promotes an existing non-admin or disabled account', async () => {
    const user = await createUser({ role: 'EMPLOYEE', isActive: false });
    const res = await seedAdminFromEnv(prisma, { ADMIN_EMAIL: user.email, ADMIN_PASSWORD: 'Str0ngAdmin!' });
    expect(res.status).toBe('promoted');
    expect(await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).toMatchObject({ role: 'ADMIN', isActive: true });
  });

  it.each([
    [{ ADMIN_EMAIL: 'a@rubicotech.com' }, /both/],
    [{ ADMIN_PASSWORD: 'Str0ngAdmin!' }, /both/],
    [{ ADMIN_EMAIL: 'not-an-email', ADMIN_PASSWORD: 'Str0ngAdmin!' }, /valid email/],
    [{ ADMIN_EMAIL: 'a@rubicotech.com', ADMIN_PASSWORD: 'change-me' }, /placeholder or too weak/],
    [{ ADMIN_EMAIL: 'a@rubicotech.com', ADMIN_PASSWORD: 'short1' }, /placeholder or too weak/],
  ])('refuses %o', async (env, message) => {
    await expect(seedAdminFromEnv(prisma, env)).rejects.toThrow(message);
  });
});

describe('sign-up domains from .env (seedAllowedDomainsFromEnv)', () => {
  it('replaces the allowed domains: the new domain signs up, the old one is refused', async () => {
    const before = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
    try {
      const domains = await seedAllowedDomainsFromEnv(prisma, { ALLOWED_EMAIL_DOMAINS: ' Example.org , @example.in,example.in ' });
      expect(domains).toEqual(['example.org', 'example.in']);
      const ok = await request(app).post('/api/auth/signup').send({ name: 'Example Person', email: uniqueEmail('e').replace('@rubicotech.com', '@example.in'), password: 'Lunch2026' });
      expect(ok.status).toBe(201);
      const refused = await request(app).post('/api/auth/signup').send({ name: 'Default Domain', email: uniqueEmail(), password: 'Lunch2026' });
      expect(refused.status).toBe(403);
      expect(refused.body.error.message).toBe('Use your company email (@example.org or @example.in)');
    } finally {
      await prisma.settings.update({ where: { id: 1 }, data: { allowedDomains: before.allowedDomains } });
    }
  });

  it('leaves the settings alone when not set, and refuses invalid domains', async () => {
    expect(await seedAllowedDomainsFromEnv(prisma, {})).toBeNull();
    await expect(seedAllowedDomainsFromEnv(prisma, { ALLOWED_EMAIL_DOMAINS: 'example' })).rejects.toThrow(/invalid domain/);
    await expect(seedAllowedDomainsFromEnv(prisma, { ALLOWED_EMAIL_DOMAINS: 'x@example.in' })).rejects.toThrow(/invalid domain/);
  });
});
