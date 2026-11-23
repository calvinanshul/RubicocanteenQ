import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addDays, dbDate, todayIST } from '@/server/adapters/clock';
import { route } from '@/server/http/route';
import { SEED_DISHES, SEED_USERS, seed } from '../../prisma/seedData';
import { app, createUser, dishId, expectErrorShape, prisma } from './helpers';

afterEach(() => vi.restoreAllMocks());

// AC 00-4: unexpected errors → 500 INTERNAL_ERROR, generic message, no stack trace (US-15 AC5)
describe('unexpected errors (AC 00-4)', () => {
  it('returns a generic 500 without leaking the error', async () => {
    const boom = route({ public: true }, () => {
      throw new Error('secret db password is hunter2 at /srv/app/db.ts:42');
    });
    const res = await boom(new Request('http://localhost/boom'), { params: Promise.resolve({}) });
    const body: unknown = await res.json();
    expect(res.status).toBe(500);
    expectErrorShape(body, 'INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toMatch(/hunter2|db\.ts|stack/);
  });

  it('a DB failure inside a real route is a clean 500', async () => {
    const { agent } = await (async () => {
      const user = await createUser({ role: 'MANAGER' });
      const a = request.agent(app);
      await a.post('/api/auth/login').send({ email: user.email, password: 'Lunch2026' }).expect(200);
      return { agent: a };
    })();
    vi.spyOn(prisma.menuItem, 'findMany').mockRejectedValueOnce(new Error('connection reset at pg.ts:9'));
    const res = await agent.get('/api/menu-items');
    expect(res.status).toBe(500);
    expectErrorShape(res.body, 'INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/pg\.ts|connection reset/);
  });

  it('an oversized body is rejected with the standard error shape', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@rubicotech.com', password: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBeDefined();
  });
});

// AC 00-5: health → 503 when the DB is down
describe('health when the DB is down (AC 00-5)', () => {
  it('returns 503 with db: down', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'error', db: 'down' });
  });
});

// AC 00-6: constraints from 05-data-model.md §2
describe('database constraints (AC 00-6)', () => {
  it('CHECK: orderedQty can never exceed quantity (BR2)', async () => {
    const menuItemId = await dishId('Masala Chaas');
    await expect(
      prisma.dailyMenuItem.create({ data: { menuDate: dbDate('2031-03-03'), menuItemId, quantity: 5, orderedQty: 6 } }),
    ).rejects.toThrow();
  });

  it('CHECK: daily quantity 1–1000 and price ₹1–₹1,000', async () => {
    const menuItemId = await dishId('Masala Chaas');
    await expect(prisma.dailyMenuItem.create({ data: { menuDate: dbDate('2031-03-04'), menuItemId, quantity: 0 } })).rejects.toThrow();
    await expect(
      prisma.menuItem.create({ data: { name: `Cheap ${Date.now()}`, category: 'MAIN', diet: 'VEG', pricePaise: 99 } }),
    ).rejects.toThrow();
  });

  it('partial unique index: active dish names are unique case-insensitively, archived ones are not', async () => {
    const name = `Unique Dish ${Date.now()}`;
    const first = await prisma.menuItem.create({ data: { name, category: 'MAIN', diet: 'VEG', pricePaise: 5000 } });
    await expect(prisma.menuItem.create({ data: { name: name.toUpperCase(), category: 'MAIN', diet: 'VEG', pricePaise: 5000 } })).rejects.toThrow();
    await prisma.menuItem.update({ where: { id: first.id }, data: { isActive: false } });
    await expect(prisma.menuItem.create({ data: { name, category: 'MAIN', diet: 'VEG', pricePaise: 5000 } })).resolves.toBeTruthy();
  });

  it('partial unique index: one active order per user per day, re-order allowed after cancel (BR4)', async () => {
    const user = await createUser();
    const base = { userId: user.id, orderDate: dbDate('2031-03-05'), slotStart: '13:00', totalPaise: 100 };
    const first = await prisma.order.create({ data: { ...base, pickupCode: 'AAA22A' } });
    await expect(prisma.order.create({ data: { ...base, pickupCode: 'AAA22B' } })).rejects.toThrow();
    await prisma.order.update({ where: { id: first.id }, data: { status: 'CANCELLED' } });
    await expect(prisma.order.create({ data: { ...base, pickupCode: 'AAA22C' } })).resolves.toBeTruthy();
  });

  it('CHECK: order item qty ≥ 1 (BR3)', async () => {
    const user = await createUser();
    const order = await prisma.order.create({
      data: { userId: user.id, orderDate: dbDate('2031-03-06'), slotStart: '13:00', totalPaise: 100, pickupCode: 'BBB22B' },
    });
    const dmi = await prisma.dailyMenuItem.create({ data: { menuDate: dbDate('2031-03-06'), menuItemId: await dishId('Curd Rice'), quantity: 10 } });
    await expect(
      prisma.orderItem.create({ data: { orderId: order.id, dailyMenuItemId: dmi.id, itemNameSnapshot: 'Curd Rice', unitPricePaiseSnapshot: 6000, qty: 0 } }),
    ).rejects.toThrow();
  });
});

// AC 00-7: seed contents and idempotence
describe('seed (AC 00-7)', () => {
  it('has the 4 role users with employee codes and departments', async () => {
    for (const u of SEED_USERS) {
      const row = await prisma.user.findUniqueOrThrow({ where: { email: u.email } });
      expect(row).toMatchObject({ role: u.role, employeeCode: u.employeeCode, department: u.department, isActive: true });
    }
    const priya = await prisma.user.findUniqueOrThrow({ where: { email: 'priya@rubicotech.com' } });
    expect(priya.employeeCode).toBe('EMP-8921');
  });

  it('logs in with the documented demo passwords', async () => {
    for (const u of SEED_USERS) {
      const res = await request(app).post('/api/auth/login').send({ email: u.email, password: u.password });
      expect(res.status, u.email).toBe(200);
      expect(res.body.user.role).toBe(u.role);
    }
  });

  it('has settings with the design pickup location', async () => {
    const s = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
    expect(s).toMatchObject({ pickupLocation: 'Building 4 · Counter A', orderCutoff: '11:00', slotCapacity: 30, maxQtyPerItem: 5 });
  });

  it("has the 6 design dishes on today's and tomorrow's menu", async () => {
    for (const d of SEED_DISHES) {
      const item = await prisma.menuItem.findFirstOrThrow({ where: { name: d.name, isActive: true } });
      expect(item).toMatchObject({ pricePaise: d.pricePaise, category: d.category, diet: d.diet });
      for (const date of [todayIST(), addDays(todayIST(), 1)]) {
        const row = await prisma.dailyMenuItem.findUnique({ where: { menuDate_menuItemId: { menuDate: dbDate(date), menuItemId: item.id } } });
        expect(row, `${d.name} on ${date}`).not.toBeNull();
      }
    }
  });

  it('is idempotent: running it again creates no duplicates', async () => {
    const before = { users: await prisma.user.count(), items: await prisma.menuItem.count(), daily: await prisma.dailyMenuItem.count() };
    await seed(prisma);
    const after = { users: await prisma.user.count(), items: await prisma.menuItem.count(), daily: await prisma.dailyMenuItem.count() };
    expect(after).toEqual(before);
  });
});
