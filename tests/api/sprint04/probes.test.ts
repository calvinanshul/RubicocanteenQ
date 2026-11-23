/**
 * Sprint 04 cycle-1 edge-case probes (EC-04-10 … EC-04-17). Rows: docs/test-cases/features/.
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { sprintActive } from '../../sprintGate';
import { agentFor, app, at, createUser, expectErrorShape, insertOrder, prisma, seedDailyItem, TEST_PASSWORD } from '../helpers';

const line = (csv: string, needle: string) => csv.split(/\r?\n/).find((l) => l.includes(needle));

describe.skipIf(!sprintActive(4))('Sprint 04 · probes (cycle 1)', () => {
  it('EC-04-10 two admins demoting each other at the same moment: exactly one wins (LAST_ADMIN race)', async () => {
    const others = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true } });
    await prisma.user.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { isActive: false } });
    try {
      const a = await agentFor('ADMIN');
      const b = await agentFor('ADMIN');
      const [ra, rb] = await Promise.all([
        a.agent.patch(`/api/users/${b.user.id}`).send({ role: 'EMPLOYEE' }),
        b.agent.patch(`/api/users/${a.user.id}`).send({ role: 'EMPLOYEE' }),
      ]);
      const statuses = [ra.status, rb.status].sort();
      // One demotion succeeds; the other is refused (or the demoted caller is no longer an admin → 403)
      expect(statuses[0]).toBe(200);
      expect([403, 409]).toContain(statuses[1]);
      expect(await prisma.user.count({ where: { id: { in: [a.user.id, b.user.id] }, role: 'ADMIN', isActive: true } })).toBe(1);
      await prisma.user.updateMany({ where: { id: { in: [a.user.id, b.user.id] } }, data: { isActive: false } });
    } finally {
      await prisma.user.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { isActive: true } });
    }
  });

  it('EC-04-11 restoring an archived dish whose name is now taken → 409 DUPLICATE_NAME', async () => {
    const { agent } = await agentFor('MANAGER');
    const name = `Restore Clash ${Date.now()}`;
    const old = await agent.post('/api/menu-items').send({ name, category: 'MAIN', pricePaise: 9000, diet: 'VEG' });
    await agent.patch(`/api/menu-items/${old.body.id}`).send({ isActive: false }).expect(200);
    await agent.post('/api/menu-items').send({ name: name.toUpperCase(), category: 'MAIN', pricePaise: 9000, diet: 'VEG' }).expect(201);
    const res = await agent.patch(`/api/menu-items/${old.body.id}`).send({ isActive: true });
    expect(res.status).toBe(409);
    expectErrorShape(res.body, 'DUPLICATE_NAME');
  });

  it('EC-04-12 statement month edges: 31 Dec billed in December, 1 Jan not; formula names escaped', async () => {
    const user = await createUser({ name: '+Formula Person' });
    const d31 = await seedDailyItem({ date: '2030-12-31', quantity: 10, pricePaise: 10000 });
    const d1 = await seedDailyItem({ date: '2031-01-01', quantity: 10, pricePaise: 10000 });
    await insertOrder({ userId: user.id, date: '2030-12-31', status: 'COLLECTED', items: [{ dailyMenuItemId: d31.dailyMenuItemId, qty: 2, name: d31.name, pricePaise: 10000 }] });
    await insertOrder({ userId: user.id, date: '2031-01-01', status: 'COLLECTED', items: [{ dailyMenuItemId: d1.dailyMenuItemId, qty: 1, name: d1.name, pricePaise: 10000 }] });
    const { agent } = await agentFor('ADMIN');
    const dec = await agent.get('/api/reports/statement.csv?month=2030-12');
    expect(dec.status).toBe(200);
    expect(dec.headers['content-disposition']).toContain('statement_2030-12.csv');
    const row = line(dec.text, user.email);
    expect(row).toMatch(/^'\+Formula Person,/);
    expect(row).toMatch(/,1,200\.00$/);
    expect(line((await agent.get('/api/reports/statement.csv?month=2031-01')).text, user.email)).toMatch(/,1,100\.00$/);
  });

  it('EC-04-13 orders CSV rows: items, rupees, status, slot; cancelled orders listed', async () => {
    const user = await createUser({ name: 'Csv Row Person' });
    const dish = await seedDailyItem({ date: '2030-09-03', quantity: 10, pricePaise: 12000 });
    const o = await insertOrder({ userId: user.id, date: '2030-09-03', slotStart: '13:00', status: 'CANCELLED', items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 2, name: dish.name, pricePaise: 12000 }] });
    const { agent } = await agentFor('MANAGER');
    const res = await agent.get('/api/reports/orders.csv?from=2030-09-03&to=2030-09-03');
    const row = line(res.text, user.email);
    expect(row).toBe(`2030-09-03,${o.id},${o.pickupCode},Csv Row Person,${user.email},2 x ${dish.name},240.00,CANCELLED,13:00-13:15`);
  });

  it('EC-04-14 auto no-show leaves orders inside the grace period and in later slots alone', async () => {
    const date = '2030-08-20';
    const dish = await seedDailyItem({ date, quantity: 20 });
    const items = [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1, name: dish.name, pricePaise: dish.pricePaise }];
    const early = await insertOrder({ userId: (await createUser()).id, date, slotStart: '12:30', status: 'PLACED', items });
    const grace = await insertOrder({ userId: (await createUser()).id, date, slotStart: '13:00', status: 'READY', items });
    const later = await insertOrder({ userId: (await createUser()).id, date, slotStart: '14:00', status: 'PLACED', items });
    const wrong = await request(app).post('/api/cron/no-show').set('Authorization', 'Bearer wrong-secret-value');
    expect(wrong.status).toBe(401);
    // 13:44: 12:30 slot ended 12:45 (+30 grace = 13:15, overdue); 13:00 slot ends 13:15 (+30 = 13:45, not yet)
    const res = await request(app)
      .post('/api/cron/no-show')
      .set('Authorization', `Bearer ${process.env.CRON_SECRET ?? ''}`)
      .set('x-test-now', at(date, '13:44'));
    expect(res.status).toBe(200);
    const status = async (id: number) => (await prisma.order.findUniqueOrThrow({ where: { id } })).status;
    expect(await status(early.id)).toBe('NO_SHOW');
    expect(await status(grace.id)).toBe('READY');
    expect(await status(later.id)).toBe('PLACED');
  });

  it("EC-04-15 disabling a user ends their current session (US-04 AC3, BR12)", async () => {
    const user = await createUser();
    const self = request.agent(app);
    await self.post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD }).expect(200);
    expect((await self.get('/api/orders/me')).status).toBe(200);
    const { agent } = await agentFor('ADMIN');
    await agent.patch(`/api/users/${user.id}`).send({ isActive: false }).expect(200);
    expect((await self.get('/api/orders/me')).status).toBe(401);
  });

  it('EC-04-16 role filter and per-role counts; no password data', async () => {
    const tag = `chiptag${Date.now()}`;
    await createUser({ name: `Chip ${tag} A`, role: 'STAFF', email: `${tag}.a@rubicotech.com` });
    await createUser({ name: `Chip ${tag} B`, email: `${tag}.b@rubicotech.com` });
    const { agent } = await agentFor('ADMIN');
    const res = await agent.get(`/api/users?q=${tag}&role=STAFF`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].role).toBe('STAFF');
    expect(res.body.roleCounts).toMatchObject({ ALL: 2, STAFF: 1, EMPLOYEE: 1, MANAGER: 0, ADMIN: 0 });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|failedLogin|lockedUntil/);
  });

  it('EC-04-17 my-orders summary bills this month, not cancelled orders or other months', async () => {
    const user = await createUser();
    const now = new Date();
    const ist = new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
    const month = ist.slice(0, 7);
    const d1 = await seedDailyItem({ date: `${month}-01`, quantity: 10, pricePaise: 10000 });
    await insertOrder({ userId: user.id, date: `${month}-01`, status: 'NO_SHOW', items: [{ dailyMenuItemId: d1.dailyMenuItemId, qty: 1, name: d1.name, pricePaise: 10000 }] });
    await insertOrder({ userId: user.id, date: `${month}-01`, status: 'CANCELLED', items: [{ dailyMenuItemId: d1.dailyMenuItemId, qty: 3, name: d1.name, pricePaise: 10000 }] });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD }).expect(200);
    const res = await agent.get('/api/orders/me');
    expect(res.body.summary).toEqual({ month, orders: 1, totalPaise: 10000 });
  });
});
