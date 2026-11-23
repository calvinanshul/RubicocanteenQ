/** Deploy: the Next.js app answers /api with JSON, and the production seed is safe to repeat. */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseAllowedDomains, seedProductionFromEnv } from '../../prisma/seedAdmin';
import { parseEnv } from '@/server/env';
import { app, createUser, prisma, uniqueEmail } from './helpers';

describe('API routing on Next.js', () => {
  it('keeps the API in charge of /api: JSON health, JSON 404 for unknown API paths', async () => {
    expect((await request(app).get('/api/health')).body.status).toBe('ok');
    const missing = await request(app).get('/api/nope');
    expect(missing.status).toBe(404);
    expect(missing.headers['content-type']).toMatch(/json/);
    const root = await request(app).get('/api');
    expect(root.status).toBe(404);
    expect(root.headers['content-type']).toMatch(/json/);
  });

  it('uses RENDER_EXTERNAL_URL as the web origin unless WEB_ORIGIN is set', () => {
    const base = { DATABASE_URL: 'postgresql://x', SESSION_SECRET: 's'.repeat(32) };
    expect(parseEnv({ ...base, RENDER_EXTERNAL_URL: 'https://canteenq.onrender.com' }).WEB_ORIGIN).toBe('https://canteenq.onrender.com');
    expect(parseEnv({ ...base, RENDER_EXTERNAL_URL: 'https://a.onrender.com', WEB_ORIGIN: 'https://lunch.example.com' }).WEB_ORIGIN).toBe('https://lunch.example.com');
    expect(parseEnv(base).WEB_ORIGIN).toBe('http://localhost:3000');
  });
});

describe('production seed (seedProductionFromEnv)', () => {
  type SettingsRow = NonNullable<Awaited<ReturnType<typeof prisma.settings.findUnique>>>;
  let saved: SettingsRow;

  beforeAll(async () => {
    saved = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
  });
  afterAll(async () => {
    const { updatedAt: _u, ...rest } = saved;
    await prisma.settings.upsert({ where: { id: 1 }, update: rest, create: rest });
  });

  it('first start creates settings with the given domains and the admin; later starts change nothing', async () => {
    await prisma.settings.delete({ where: { id: 1 } });
    const email = uniqueEmail('prodadmin');
    const env = { ADMIN_EMAIL: email, ADMIN_PASSWORD: 'Str0ngAdmin!', ALLOWED_EMAIL_DOMAINS: 'rubicotech.com, @RubicoTech.in' };

    const first = await seedProductionFromEnv(prisma, env);
    expect(first).toEqual({ settingsCreated: true, domains: ['rubicotech.com', 'rubicotech.in'], admin: { status: 'created', email } });
    expect((await prisma.settings.findUniqueOrThrow({ where: { id: 1 } })).allowedDomains).toBe('rubicotech.com,rubicotech.in');

    // An admin changes the domains in Settings; a restart must not undo it
    await prisma.settings.update({ where: { id: 1 }, data: { allowedDomains: 'rubicotech.com' } });
    const again = await seedProductionFromEnv(prisma, { ...env, ADMIN_PASSWORD: 'Different99' });
    expect(again).toEqual({ settingsCreated: false, domains: null, admin: { status: 'unchanged', email } });
    expect((await prisma.settings.findUniqueOrThrow({ where: { id: 1 } })).allowedDomains).toBe('rubicotech.com');
  });

  it('adds no demo accounts or dishes', async () => {
    const users = await prisma.user.count();
    const dishes = await prisma.menuItem.count();
    await seedProductionFromEnv(prisma, { ADMIN_EMAIL: uniqueEmail('prodadmin'), ADMIN_PASSWORD: 'Str0ngAdmin!' });
    expect(await prisma.user.count()).toBe(users + 1);
    expect(await prisma.menuItem.count()).toBe(dishes);
  });

  it('may skip the admin values once an active admin exists', async () => {
    await createUser({ role: 'ADMIN' });
    expect((await seedProductionFromEnv(prisma, {})).admin.status).toBe('skipped');
  });

  it('refuses to finish without any active admin, and rejects bad domains before writing', async () => {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
    await prisma.user.updateMany({ where: { id: { in: admins.map((a) => a.id) } }, data: { isActive: false } });
    try {
      await expect(seedProductionFromEnv(prisma, {})).rejects.toThrow(/No active admin/);
    } finally {
      await prisma.user.updateMany({ where: { id: { in: admins.map((a) => a.id) } }, data: { isActive: true } });
    }
    await expect(seedProductionFromEnv(prisma, { ALLOWED_EMAIL_DOMAINS: 'not a domain' })).rejects.toThrow(/invalid domain/);
    expect(parseAllowedDomains('  ')).toBeNull();
  });
});
