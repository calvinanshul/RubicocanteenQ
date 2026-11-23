/**
 * Sprint 03 acceptance scripts: staff queue, status, verify/collect, prep list, dashboard
 * (US-12, US-13, US-14). Cases: docs/test-cases/features/ (Sprint S03 rows).
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { sprintActive } from '../../sprintGate';
import { agentFor, app, at, createUser, expectErrorShape, insertOrder, prisma, seedDailyItem, withSettings } from '../helpers';

type Status = 'PLACED' | 'PREPARING' | 'READY' | 'COLLECTED' | 'CANCELLED' | 'NO_SHOW';

/** One order on `date` for a fresh employee. */
async function orderOn(date: string, status: Status = 'PLACED', slotStart = '13:00', dish?: Awaited<ReturnType<typeof seedDailyItem>>, qty = 1) {
  const d = dish ?? (await seedDailyItem({ date, quantity: 100 }));
  const user = await createUser({ name: 'Queue Person' });
  await prisma.user.update({ where: { id: user.id }, data: { department: 'Tech Eng' } });
  const order = await insertOrder({ userId: user.id, date, slotStart, status, items: [{ dailyMenuItemId: d.dailyMenuItemId, qty, name: d.name, pricePaise: d.pricePaise }] });
  return { order, user, dish: d };
}

describe.skipIf(!sprintActive(3))('Sprint 03 · staff queue and status (Q1, Q2)', () => {
  const DATE = '2030-04-02'; // Tue
  const NOW = at(DATE, '12:40');

  it('TC-API-STF-01 groups orders by slot with counts and a status filter', async () => {
    const date = '2030-04-03';
    const dish = await seedDailyItem({ date, quantity: 100 });
    for (const [slot, status] of [['12:30', 'PLACED'], ['12:30', 'READY'], ['12:30', 'PLACED'], ['12:45', 'PREPARING'], ['12:45', 'READY']] as const) {
      await orderOn(date, status, slot, dish);
    }
    const { agent } = await agentFor('STAFF');
    const res = await agent.get(`/api/orders?date=${date}`).set('x-test-now', at(date, '12:35'));
    expect(res.status).toBe(200);
    expect(res.body.slots.map((s: { start: string }) => s.start)).toEqual(['12:30', '12:45']);
    expect(res.body.slots[0].orders).toHaveLength(3);
    expect(res.body.counts).toMatchObject({ PLACED: 2, PREPARING: 1, READY: 2 });
    const o = res.body.slots[0].orders[0];
    expect(o).toEqual(expect.objectContaining({ pickupCode: expect.any(String), employeeName: 'Queue Person', department: 'Tech Eng', status: expect.any(String), items: expect.any(Array) }));
    expect(typeof res.body.lastUpdated).toBe('string');

    const ready = await agent.get(`/api/orders?date=${date}&status=READY`).set('x-test-now', at(date, '12:35'));
    const statuses = ready.body.slots.flatMap((s: { orders: { status: string }[] }) => s.orders.map((x) => x.status));
    expect(statuses).toEqual(['READY', 'READY']);
  });

  it('TC-API-STF-02 PLACED → PREPARING → READY sets readyAt', async () => {
    const { order } = await orderOn(DATE);
    const { agent } = await agentFor('STAFF');
    const p = await agent.patch(`/api/orders/${order.id}/status`).set('x-test-now', NOW).send({ status: 'PREPARING' });
    expect(p.status).toBe(200);
    expect(p.body.status).toBe('PREPARING');
    const r = await agent.patch(`/api/orders/${order.id}/status`).set('x-test-now', NOW).send({ status: 'READY' });
    expect(r.status).toBe(200);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).readyAt).not.toBeNull();
  });

  it('TC-API-STF-03 COLLECTED via PATCH and CANCELLED → PREPARING are refused', async () => {
    const { order } = await orderOn(DATE, 'READY');
    const { agent } = await agentFor('STAFF');
    const r1 = await agent.patch(`/api/orders/${order.id}/status`).send({ status: 'COLLECTED' });
    expect([400, 409]).toContain(r1.status);
    const { order: cancelled } = await orderOn(DATE, 'CANCELLED');
    const r2 = await agent.patch(`/api/orders/${cancelled.id}/status`).send({ status: 'PREPARING' });
    expect(r2.status).toBe(409);
    expectErrorShape(r2.body, 'INVALID_TRANSITION');
  });

  it('EC-03-01 PLACED → READY (skipping PREPARING) is refused', async () => {
    const { order } = await orderOn(DATE);
    const { agent } = await agentFor('STAFF');
    const res = await agent.patch(`/api/orders/${order.id}/status`).send({ status: 'READY' });
    expect(res.status).toBe(409);
  });

  it('EC-03-02 an unknown status value → 400', async () => {
    const { order } = await orderOn(DATE);
    const { agent } = await agentFor('STAFF');
    for (const status of ['DONE', '', null, 3]) {
      expect((await agent.patch(`/api/orders/${order.id}/status`).send({ status })).status).toBe(400);
    }
  });

  it.each(['EMPLOYEE', 'MANAGER', 'ADMIN'] as const)('EC-03-03 %s cannot read the queue, change status, hand over or read the prep list', async (role) => {
    const { order } = await orderOn(DATE);
    const { agent } = await agentFor(role);
    expect((await agent.get(`/api/orders?date=${DATE}`)).status).toBe(403);
    expect((await agent.patch(`/api/orders/${order.id}/status`).send({ status: 'PREPARING' })).status).toBe(403);
    expect((await agent.post('/api/orders/verify').send({ pickupCode: order.pickupCode })).status).toBe(403);
    expect((await agent.post(`/api/orders/${order.id}/collect`)).status).toBe(403);
    expect((await agent.get(`/api/reports/prep-list?date=${DATE}`)).status).toBe(403);
  });

  it('EC-03-04 staff can mark a no-show; status of a missing order → 404', async () => {
    const { order } = await orderOn(DATE, 'READY');
    const { agent } = await agentFor('STAFF');
    expect((await agent.patch(`/api/orders/${order.id}/status`).set('x-test-now', at(DATE, '14:00')).send({ status: 'NO_SHOW' })).status).toBe(200);
    expect((await agent.patch('/api/orders/99999999/status').send({ status: 'PREPARING' })).status).toBe(404);
  });

  it('EC-03-05 queue query validation: bad date or status → 400', async () => {
    const { agent } = await agentFor('STAFF');
    expect((await agent.get('/api/orders?date=2030-02-30')).status).toBe(400);
    expect((await agent.get(`/api/orders?date=${DATE}&status=EATEN`)).status).toBe(400);
  });
});

describe.skipIf(!sprintActive(3))('Sprint 03 · verify and collect (Q3, Q4)', () => {
  const DATE = '2030-04-04'; // Thu
  const NOW = at(DATE, '13:05');

  it('TC-API-STF-05 verify then collect records who and when', async () => {
    const { order, dish } = await orderOn(DATE, 'READY');
    const { agent, user: staff } = await agentFor('STAFF');
    const v = await agent.post('/api/orders/verify').set('x-test-now', NOW).send({ pickupCode: order.pickupCode });
    expect(v.status).toBe(200);
    expect(v.body.warning).toBeNull();
    expect(v.body.order).toMatchObject({ id: order.id, status: 'READY' });
    expect(v.body.order.items[0].name).toBe(dish.name);
    const c = await agent.post(`/api/orders/${order.id}/collect`).set('x-test-now', NOW);
    expect(c.status).toBe(200);
    expect(c.body.status).toBe('COLLECTED');
    const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(row.collectedById).toBe(staff.id);
    expect(row.collectedAt).not.toBeNull();
  });

  it('TC-API-STF-06 lower-case and padded codes are accepted', async () => {
    const { order } = await orderOn(DATE, 'READY');
    const { agent } = await agentFor('STAFF');
    expect((await agent.post('/api/orders/verify').set('x-test-now', NOW).send({ pickupCode: order.pickupCode.toLowerCase() })).status).toBe(200);
    expect((await agent.post('/api/orders/verify').set('x-test-now', NOW).send({ pickupCode: ` ${order.pickupCode} ` })).status).toBe(200);
  });

  it('TC-API-STF-07 a second collect → 409 ALREADY_COLLECTED (and verify says so)', async () => {
    const { order } = await orderOn(DATE, 'READY');
    const { agent } = await agentFor('STAFF');
    await agent.post(`/api/orders/${order.id}/collect`).set('x-test-now', NOW).expect(200);
    const again = await agent.post(`/api/orders/${order.id}/collect`).set('x-test-now', NOW);
    expect(again.status).toBe(409);
    expectErrorShape(again.body, 'ALREADY_COLLECTED');
    const v = await agent.post('/api/orders/verify').set('x-test-now', NOW).send({ pickupCode: order.pickupCode });
    expect(v.status).toBe(409);
    expectErrorShape(v.body, 'ALREADY_COLLECTED');
  });

  it("TC-API-STF-08 tomorrow's code today → 409 WRONG_DATE (verify and collect)", async () => {
    const { order } = await orderOn('2030-04-05', 'READY');
    const { agent } = await agentFor('STAFF');
    const v = await agent.post('/api/orders/verify').set('x-test-now', NOW).send({ pickupCode: order.pickupCode });
    expect(v.status).toBe(409);
    expectErrorShape(v.body, 'WRONG_DATE');
    expect((await agent.post(`/api/orders/${order.id}/collect`).set('x-test-now', NOW)).status).toBe(409);
  });

  it('TC-API-STF-09 a cancelled code → 409 INVALID_STATUS; an unknown code → 404', async () => {
    const { order } = await orderOn(DATE, 'CANCELLED');
    const { agent } = await agentFor('STAFF');
    const c = await agent.post('/api/orders/verify').set('x-test-now', NOW).send({ pickupCode: order.pickupCode });
    expect(c.status).toBe(409);
    expectErrorShape(c.body, 'INVALID_STATUS');
    const u = await agent.post('/api/orders/verify').set('x-test-now', NOW).send({ pickupCode: 'ZZZZZZ' });
    expect(u.status).toBe(404);
  });

  it('TC-API-STF-10 a PLACED order verifies with NOT_READY and can still be handed over', async () => {
    const { order } = await orderOn(DATE, 'PLACED');
    const { agent } = await agentFor('STAFF');
    const v = await agent.post('/api/orders/verify').set('x-test-now', NOW).send({ pickupCode: order.pickupCode });
    expect(v.status).toBe(200);
    expect(v.body.warning).toBe('NOT_READY');
    const c = await agent.post(`/api/orders/${order.id}/collect`).set('x-test-now', NOW);
    expect(c.status).toBe(200);
    expect(c.body.status).toBe('COLLECTED');
  });

  it.each(['ABC', 'ABCDEFG', 'ABCDE0', 'ABCDEI', '', '!!!!!!'])('EC-03-06 malformed code %j → 400', async (pickupCode) => {
    const { agent } = await agentFor('STAFF');
    expect((await agent.post('/api/orders/verify').set('x-test-now', NOW).send({ pickupCode })).status).toBe(400);
  });

  it('EC-03-07 parallel double collect: exactly one succeeds', async () => {
    const { order } = await orderOn(DATE, 'READY');
    const a = await agentFor('STAFF');
    const b = await agentFor('STAFF');
    const [r1, r2] = await Promise.all([
      a.agent.post(`/api/orders/${order.id}/collect`).set('x-test-now', NOW),
      b.agent.post(`/api/orders/${order.id}/collect`).set('x-test-now', NOW),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
  });

  it('EC-03-08 a NO_SHOW order cannot be collected', async () => {
    const { order } = await orderOn(DATE, 'NO_SHOW');
    const { agent } = await agentFor('STAFF');
    expect((await agent.post(`/api/orders/${order.id}/collect`).set('x-test-now', NOW)).status).toBe(409);
  });
});

describe.skipIf(!sprintActive(3))('Sprint 03 · prep list and dashboard (R1, R2)', () => {
  it('TC-API-STF-04 the prep list excludes cancelled orders', async () => {
    const date = '2030-04-09';
    const dish = await seedDailyItem({ date, quantity: 100, name: `Prep Dish ${Date.now()}` });
    await orderOn(date, 'PLACED', '13:00', dish, 2);
    await orderOn(date, 'READY', '13:00', dish, 3);
    await orderOn(date, 'CANCELLED', '13:00', dish, 4);
    const { agent } = await agentFor('STAFF');
    const res = await agent.get(`/api/reports/prep-list?date=${date}`);
    expect(res.status).toBe(200);
    expect(res.body.find((r: { name: string }) => r.name === dish.name)?.qty).toBe(5);
  });

  it('TC-API-RPT-01 dashboard numbers match a known set; admin sees the same', async () => {
    const date = '2030-04-10'; // Wed
    const dish = await seedDailyItem({ date, quantity: 20, pricePaise: 10000, name: `Dash Dish ${Date.now()}` });
    const plan: [Status, string][] = [
      ['COLLECTED', '12:30'], ['COLLECTED', '12:30'], ['COLLECTED', '13:00'], ['COLLECTED', '13:00'], ['COLLECTED', '13:00'], ['COLLECTED', '13:15'],
      ['PLACED', '13:00'], ['READY', '13:15'], ['CANCELLED', '13:00'], ['NO_SHOW', '12:30'],
    ];
    for (const [status, slot] of plan) await orderOn(date, status, slot, dish);
    const { agent } = await agentFor('MANAGER');
    const res = await agent.get(`/api/reports/dashboard?date=${date}`).set('x-test-now', at(date, '15:00'));
    expect(res.status).toBe(200);
    expect(res.body.kpis).toMatchObject({ orders: 10, collected: 6, pending: 2, cancelled: 1, noShow: 1, revenuePaise: 9 * 10000 });
    expect(res.body.items.find((i: { name: string }) => i.name === dish.name)).toMatchObject({ ordered: 9, quantity: 20, remaining: 11, soldOut: false });
    const slotCount = (s: string) => res.body.slots.find((x: { start: string }) => x.start === s)?.count;
    expect([slotCount('12:30'), slotCount('13:00'), slotCount('13:15')]).toEqual([3, 4, 2]);
    expect(res.body.peakSlot).toBe('13:00');

    const { agent: admin } = await agentFor('ADMIN');
    const asAdmin = await admin.get(`/api/reports/dashboard?date=${date}`).set('x-test-now', at(date, '15:00'));
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.kpis).toEqual(res.body.kpis);
  });

  it('TC-API-RPT-02 employees and staff get 403; an empty day is all zeros', async () => {
    for (const role of ['EMPLOYEE', 'STAFF'] as const) {
      const { agent } = await agentFor(role);
      expect((await agent.get('/api/reports/dashboard?date=2030-04-11')).status, role).toBe(403);
    }
    const { agent } = await agentFor('MANAGER');
    const res = await agent.get('/api/reports/dashboard?date=2030-04-16');
    expect(res.status).toBe(200);
    expect(res.body.kpis).toMatchObject({ orders: 0, revenuePaise: 0, collected: 0, pending: 0, cancelled: 0, noShow: 0 });
    expect(res.body.items).toEqual([]);
  });

  it('TC-API-RPT-05 design extras: average, collected %, vs yesterday, peak, capacity', async () => {
    const restore = await withSettings({ slotCapacity: 30 });
    try {
      const today = '2030-04-23'; // Tue
      const yesterday = '2030-04-22'; // Mon
      const dish = await seedDailyItem({ date: today, quantity: 50, pricePaise: 11500 });
      const yDish = await seedDailyItem({ date: yesterday, quantity: 50, pricePaise: 11500 });
      const statuses: Status[] = ['COLLECTED', 'COLLECTED', 'COLLECTED', 'COLLECTED', 'COLLECTED', 'COLLECTED', 'PLACED', 'PLACED', 'READY', 'READY'];
      // 6 orders at 13:00 and 4 at 12:45, so 13:00 is strictly the busiest slot
      for (const [i, s] of statuses.entries()) await orderOn(today, s, i < 6 ? '13:00' : '12:45', dish);
      for (let i = 0; i < 8; i++) await orderOn(yesterday, 'COLLECTED', '13:00', yDish);
      const { agent } = await agentFor('MANAGER');
      const res = await agent.get(`/api/reports/dashboard?date=${today}`).set('x-test-now', at(today, '15:00'));
      expect(res.status).toBe(200);
      expect(res.body.kpis).toMatchObject({ orders: 10, revenuePaise: 115000, avgOrderPaise: 11500, collectedPct: 60, vsYesterdayPct: 25 });
      expect(res.body.capacityPerSlot).toBe(30);
      expect(res.body.peakSlot).toBe('13:00');
    } finally {
      await restore();
    }
  });

  it('EC-03-09 vsYesterdayPct is null when the previous working day had no orders (Monday looks back to Friday)', async () => {
    const monday = '2030-04-29';
    const dish = await seedDailyItem({ date: monday, quantity: 10 });
    await orderOn(monday, 'PLACED', '13:00', dish);
    const { agent } = await agentFor('MANAGER');
    const res = await agent.get(`/api/reports/dashboard?date=${monday}`);
    expect(res.body.kpis.vsYesterdayPct).toBeNull();
  });

  it('EC-03-12 a tie for the busiest slot goes to the earliest slot', async () => {
    const date = '2030-04-25';
    const dish = await seedDailyItem({ date, quantity: 20 });
    for (const slot of ['13:30', '13:30', '12:45', '12:45']) await orderOn(date, 'PLACED', slot, dish);
    const { agent } = await agentFor('MANAGER');
    expect((await agent.get(`/api/reports/dashboard?date=${date}`)).body.peakSlot).toBe('12:45');
  });

  it('EC-03-10 a sold-out dish is flagged', async () => {
    const date = '2030-04-24';
    const dish = await seedDailyItem({ date, quantity: 2 });
    await orderOn(date, 'PLACED', '13:00', dish, 2);
    const { agent } = await agentFor('MANAGER');
    const res = await agent.get(`/api/reports/dashboard?date=${date}`);
    expect(res.body.items.find((i: { name: string }) => i.name === dish.name)).toMatchObject({ remaining: 0, soldOut: true });
  });

  it('EC-03-11 report queries need a valid date; unauthenticated → 401', async () => {
    const { agent } = await agentFor('MANAGER');
    expect((await agent.get('/api/reports/dashboard?date=bad')).status).toBe(400);
    const { agent: staff } = await agentFor('STAFF');
    expect((await staff.get('/api/reports/prep-list?date=bad')).status).toBe(400);
    expect((await request(app).get('/api/reports/dashboard?date=2030-04-24')).status).toBe(401);
  });
});
