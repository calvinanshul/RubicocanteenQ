import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { dbDate } from '@/server/adapters/clock';
import { agentFor, app, createUser, dishId, expectErrorShape, ist, prisma, TEST_PASSWORD, uniqueEmail } from './helpers';

const NOW = ist('2030-02-05T09:00:00'); // Tue 5 Feb 2030

describe('sign-up edge cases', () => {
  it.each([
    ['81-char name', { name: 'N'.repeat(81), password: 'Lunch2026' }, 'name'],
    ['65-char password', { name: 'Long Pass', password: 'a1'.repeat(33).slice(0, 65) }, 'password'],
    ['whitespace-only name', { name: '   ', password: 'Lunch2026' }, 'name'],
  ])('rejects %s', async (_label, body, field) => {
    const res = await request(app).post('/api/auth/signup').send({ email: uniqueEmail(), ...body });
    expect(res.status).toBe(400);
    expect(res.body.error.fields[field]).toBeDefined();
  });

  it('rejects an email over 254 characters', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'Long Mail', email: `${'a'.repeat(250)}@rubicotech.com`, password: 'Lunch2026' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.email).toBeDefined();
  });

  it('rejects a look-alike domain (sub-domain or suffix)', async () => {
    for (const email of ['x@mail.rubicotech.com', 'x@rubicotech.com.evil.io', 'x@notrubicotech.com', 'x@rubicotech.in.evil.io', 'x@mail.rubicotech.in', 'x@company.net']) {
      const res = await request(app).post('/api/auth/signup').send({ name: 'Look Alike', email, password: 'Lunch2026' });
      expect(res.status, email).toBe(403);
    }
  });

  it('stores an HTML name as literal text (US-15 AC4)', async () => {
    const email = uniqueEmail();
    const name = '<script>alert(1)</script>';
    const res = await request(app).post('/api/auth/signup').send({ name, email, password: 'Lunch2026' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe(name);
  });

  it('ignores a client-supplied role (always EMPLOYEE)', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'Sneaky Admin', email: uniqueEmail(), password: 'Lunch2026', role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('EMPLOYEE');
  });

  it('rejects non-string fields', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 123, email: ['a@rubicotech.com'], password: { x: 1 } });
    expect(res.status).toBe(400);
    expectErrorShape(res.body, 'VALIDATION_ERROR');
  });
});

describe('login edge cases', () => {
  it('unlocks 15 minutes after the lockout (BR11)', async () => {
    const user = await createUser();
    const t0 = '2030-02-05T09:00:00';
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').set('x-test-now', ist(t0)).send({ email: user.email, password: 'Wrong2026' }).expect(401);
    }
    await request(app).post('/api/auth/login').set('x-test-now', ist('2030-02-05T09:14:00')).send({ email: user.email, password: TEST_PASSWORD }).expect(429);
    const later = await request(app).post('/api/auth/login').set('x-test-now', ist('2030-02-05T09:16:00')).send({ email: user.email, password: TEST_PASSWORD });
    expect(later.status).toBe(200);
  });

  it('a successful login resets the failure counter', async () => {
    const user = await createUser();
    for (let i = 0; i < 4; i++) await request(app).post('/api/auth/login').send({ email: user.email, password: 'Wrong2026' }).expect(401);
    await request(app).post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD }).expect(200);
    for (let i = 0; i < 4; i++) await request(app).post('/api/auth/login').send({ email: user.email, password: 'Wrong2026' }).expect(401);
    await request(app).post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD }).expect(200);
  });

  it('a session for a deleted user is rejected', async () => {
    const user = await createUser();
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD }).expect(200);
    await prisma.user.delete({ where: { id: user.id } });
    await agent.get('/api/auth/me').expect(401);
  });

  it('logout without a session is harmless', async () => {
    await request(app).post('/api/auth/logout').expect(204);
  });

  it('ignores an invalid x-test-now value', async () => {
    const { agent } = await agentFor('EMPLOYEE');
    const res = await agent.get('/api/daily-menu?date=2030-02-06').set('x-test-now', 'not-a-date');
    expect([200, 422]).toContain(res.status);
  });
});

describe('menu access', () => {
  it.each(['EMPLOYEE', 'STAFF', 'ADMIN'] as const)('%s cannot list the catalogue (M1 is manager-only)', async (role) => {
    const { agent } = await agentFor(role);
    const res = await agent.get('/api/menu-items');
    expect(res.status).toBe(403);
  });

  it('all four roles can read the daily menu (M4)', async () => {
    for (const role of ['EMPLOYEE', 'STAFF', 'MANAGER', 'ADMIN'] as const) {
      const { agent } = await agentFor(role);
      const res = await agent.get('/api/daily-menu?date=2030-02-10').set('x-test-now', NOW); // Sunday → closed
      expect(res.status, role).toBe(200);
    }
  });
});

describe('daily menu edge cases', () => {
  it('rejects an archived dish', async () => {
    const archived = await prisma.menuItem.create({ data: { name: `Archived ${Date.now()}`, category: 'SIDE', diet: 'VEG', pricePaise: 3000, isActive: false } });
    const { agent } = await agentFor('MANAGER');
    const res = await agent.put('/api/daily-menu/2030-02-06').set('x-test-now', NOW).send({ entries: [{ menuItemId: archived.id, quantity: 5 }] });
    expect(res.status).toBe(400);
    expect(res.body.error.fields['entries.0.menuItemId']).toBeDefined();
  });

  it.each([
    ['string quantity', { entries: [{ menuItemId: 1, quantity: '5' }] }],
    ['quantity 1001', { entries: [{ menuItemId: 1, quantity: 1001 }] }],
    ['missing entries', {}],
    ['entries not an array', { entries: 'Veg Biryani' }],
    ['empty entries', { entries: [] }],
    ['101 entries', { entries: Array.from({ length: 101 }, (_, i) => ({ menuItemId: i + 1, quantity: 1 })) }],
  ])('rejects %s with 400', async (_label, body) => {
    const { agent } = await agentFor('MANAGER');
    const res = await agent.put('/api/daily-menu/2030-02-07').set('x-test-now', NOW).send(body);
    expect(res.status).toBe(400);
    expectErrorShape(res.body, 'VALIDATION_ERROR');
  });

  it('rejects an invalid date in the path', async () => {
    const { agent } = await agentFor('MANAGER');
    for (const d of ['2030-02-30', 'tomorrow', '2030-2-7']) {
      const res = await agent.put(`/api/daily-menu/${d}`).set('x-test-now', NOW).send({ entries: [{ menuItemId: 1, quantity: 5 }] });
      expect(res.status, d).toBe(400);
    }
  });

  it('rejects a repeated date query parameter', async () => {
    const { agent } = await agentFor('EMPLOYEE');
    const res = await agent.get('/api/daily-menu?date=2030-02-06&date=2030-02-07');
    expect(res.status).toBe(400);
  });

  it('refuses to remove a dish that already has orders (M5)', async () => {
    const { agent } = await agentFor('MANAGER');
    const a = await dishId('Veg Biryani');
    const b = await dishId('Curd Rice');
    await agent.put('/api/daily-menu/2030-02-08').set('x-test-now', NOW).send({ entries: [{ menuItemId: a, quantity: 10 }, { menuItemId: b, quantity: 10 }] }).expect(200);
    const dmi = await prisma.dailyMenuItem.findUniqueOrThrow({ where: { menuDate_menuItemId: { menuDate: dbDate('2030-02-08'), menuItemId: b } } });
    const user = await createUser();
    await prisma.order.create({
      data: {
        userId: user.id, orderDate: dbDate('2030-02-08'), slotStart: '13:00', totalPaise: 6000, pickupCode: 'CCC33C',
        items: { create: [{ dailyMenuItemId: dmi.id, itemNameSnapshot: 'Curd Rice', unitPricePaiseSnapshot: 6000, qty: 1 }] },
      },
    });
    await prisma.dailyMenuItem.update({ where: { id: dmi.id }, data: { orderedQty: 1 } });
    const res = await agent.put('/api/daily-menu/2030-02-08').set('x-test-now', NOW).send({ entries: [{ menuItemId: a, quantity: 10 }] });
    expect(res.status).toBe(409);
    const still = await prisma.dailyMenuItem.findUnique({ where: { id: dmi.id } });
    expect(still).not.toBeNull();
  });

  it('allows editing today before and after the cut-off (only past dates are locked)', async () => {
    const { agent } = await agentFor('MANAGER');
    const entries = [{ menuItemId: await dishId('Masala Chaas'), quantity: 50 }];
    await agent.put('/api/daily-menu/2030-02-05').set('x-test-now', ist('2030-02-05T23:59:59')).send({ entries }).expect(200);
    await agent.put('/api/daily-menu/2030-02-05').set('x-test-now', ist('2030-02-06T00:00:00')).send({ entries }).expect(400);
  });

  it('a menu saved for a closed day can be read back by the manager (editor round-trip)', async () => {
    // Settings close Sat/Sun. The manager saves Saturday 9 Feb 2030 and must see what was saved.
    const { agent } = await agentFor('MANAGER');
    const menuItemId = await dishId('Veg Biryani');
    const put = await agent.put('/api/daily-menu/2030-02-09').set('x-test-now', NOW).send({ entries: [{ menuItemId, quantity: 12 }] });
    expect(put.status).toBe(200);
    expect(put.body.closed).toBe(true);
    expect(put.body.items).toEqual([expect.objectContaining({ menuItemId, quantity: 12 })]);
  });
});

describe('cycle 2: closed days after the BUG-01-001 fix', () => {
  it('employees see the closed flag and ordering stays closed even when a menu exists', async () => {
    const { agent: manager } = await agentFor('MANAGER');
    await manager.put('/api/daily-menu/2030-02-16').set('x-test-now', NOW).send({ entries: [{ menuItemId: await dishId('Curd Rice'), quantity: 9 }] }).expect(200); // Saturday
    const { agent } = await agentFor('EMPLOYEE');
    const res = await agent.get('/api/daily-menu?date=2030-02-16').set('x-test-now', NOW);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ closed: true, orderingOpen: false });
  });

  it('an open day with no menu is still 422 MENU_NOT_PUBLISHED', async () => {
    const { agent } = await agentFor('EMPLOYEE');
    const res = await agent.get('/api/daily-menu?date=2030-02-20').set('x-test-now', NOW);
    expect(res.status).toBe(422);
  });
});
