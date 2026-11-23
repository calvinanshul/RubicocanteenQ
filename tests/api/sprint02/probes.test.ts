/** Sprint 02 cycle 1 tester probes (EC-02-18..EC-02-25). */
import { describe, expect, it } from 'vitest';
import { sprintActive } from '../../sprintGate';
import { agentFor, at, expectErrorShape, placeOrder, prisma, remaining, seedDailyItem, withSettings } from '../helpers';

const TODAY = '2030-03-26'; // Tue
const TOMORROW = '2030-03-27';

describe.skipIf(!sprintActive(2))('Sprint 02 · tester probes', () => {
  it("EC-02-18 tomorrow's order can be cancelled after today's cut-off", async () => {
    const dish = await seedDailyItem({ date: TOMORROW, quantity: 5 });
    const { agent } = await agentFor('EMPLOYEE');
    const placed = await placeOrder(agent, { date: TOMORROW, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, at(TODAY, '16:30'));
    expect(placed.status).toBe(201);
    expect(placed.body.cancellable).toBe(true);
    const res = await agent.post(`/api/orders/${placed.body.id}/cancel`).set('x-test-now', at(TODAY, '16:40'));
    expect(res.status).toBe(200);
    expect(await remaining(dish.dailyMenuItemId)).toBe(5);
  });

  it('EC-02-19 staff can read an order (O3); managers and admins cannot; only the owner gets the QR', async () => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 5 });
    const { agent } = await agentFor('EMPLOYEE');
    const placed = await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, at(TODAY, '09:00'));
    const { agent: staff } = await agentFor('STAFF');
    expect((await staff.get(`/api/orders/${placed.body.id}`)).status).toBe(200);
    expect((await staff.get(`/api/orders/${placed.body.id}/qr`)).status).toBe(403);
    for (const role of ['MANAGER', 'ADMIN'] as const) {
      const { agent: a } = await agentFor(role);
      expect((await a.get(`/api/orders/${placed.body.id}`)).status, role).toBe(403);
      expect((await a.get(`/api/orders/${placed.body.id}/qr`)).status, `${role} qr`).toBe(403);
    }
  });

  it('EC-02-20 a cancelled order frees its slot place', async () => {
    const restore = await withSettings({ slotCapacity: 1 });
    try {
      const dish = await seedDailyItem({ date: TODAY, quantity: 5 });
      const a = await agentFor('EMPLOYEE');
      const first = await placeOrder(a.agent, { date: TODAY, slotStart: '14:00', items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, at(TODAY, '09:00'));
      const b = await agentFor('EMPLOYEE');
      const blocked = await placeOrder(b.agent, { date: TODAY, slotStart: '14:00', items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, at(TODAY, '09:01'));
      expect(blocked.status).toBe(409);
      await a.agent.post(`/api/orders/${first.body.id}/cancel`).set('x-test-now', at(TODAY, '09:02')).expect(200);
      const ok = await placeOrder(b.agent, { date: TODAY, slotStart: '14:00', items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, at(TODAY, '09:03'));
      expect(ok.status).toBe(201);
    } finally {
      await restore();
    }
  });

  it('EC-02-21 two parallel cancels: one succeeds, stock restored once', async () => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 5 });
    const { agent } = await agentFor('EMPLOYEE');
    const placed = await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 2 }] }, at(TODAY, '09:00'));
    const [r1, r2] = await Promise.all([
      agent.post(`/api/orders/${placed.body.id}/cancel`).set('x-test-now', at(TODAY, '09:05')),
      agent.post(`/api/orders/${placed.body.id}/cancel`).set('x-test-now', at(TODAY, '09:05')),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
    expect(await remaining(dish.dailyMenuItemId)).toBe(5);
  });

  it('EC-02-22 buying exactly what is left works, then the dish is sold out', async () => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 3 });
    const a = await agentFor('EMPLOYEE');
    expect((await placeOrder(a.agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 3 }] }, at(TODAY, '09:00'))).status).toBe(201);
    const b = await agentFor('EMPLOYEE');
    const r = await placeOrder(b.agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, at(TODAY, '09:01'));
    expect(r.status).toBe(409);
    expect(r.body.error.message).toMatch(/sold out/i);
  });

  it('EC-02-23 the order keeps its price when the dish price changes later (BR6)', async () => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 5, pricePaise: 12000 });
    const { agent } = await agentFor('EMPLOYEE');
    const placed = await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, at(TODAY, '09:00'));
    await prisma.menuItem.update({ where: { id: dish.menuItemId }, data: { pricePaise: 15000 } });
    const res = await agent.get(`/api/orders/${placed.body.id}`);
    expect(res.body).toMatchObject({ totalPaise: 12000, items: [{ unitPricePaise: 12000 }] });
  });

  it.each([
    ['an array body', [1, 2]],
    ['qty as a string', { date: TODAY, slotStart: '13:00', items: [{ dailyMenuItemId: 1, qty: '1' }] }],
    ['11 different items', { date: TODAY, slotStart: '13:00', items: Array.from({ length: 11 }, (_, i) => ({ dailyMenuItemId: i + 1, qty: 1 })) }],
    ['a date in the wrong format', { date: '26-03-2030', slotStart: '13:00', items: [{ dailyMenuItemId: 1, qty: 1 }] }],
  ])('EC-02-24 rejects %s with 400', async (_l, body) => {
    const { agent } = await agentFor('EMPLOYEE');
    const res = await agent.post('/api/orders').set('x-test-now', at(TODAY, '09:00')).send(body);
    expect(res.status).toBe(400);
    expectErrorShape(res.body, 'VALIDATION_ERROR');
  });

  it("EC-02-25 my orders filtered by date only lists that date's orders", async () => {
    const d1 = await seedDailyItem({ date: TODAY, quantity: 5 });
    const d2 = await seedDailyItem({ date: TOMORROW, quantity: 5 });
    const { agent } = await agentFor('EMPLOYEE');
    await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: d1.dailyMenuItemId, qty: 1 }] }, at(TODAY, '09:00'));
    await placeOrder(agent, { date: TOMORROW, items: [{ dailyMenuItemId: d2.dailyMenuItemId, qty: 1 }] }, at(TODAY, '09:00'));
    const res = await agent.get(`/api/orders/me?date=${TOMORROW}`);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].date).toBe(TOMORROW);
    expect((await agent.get('/api/orders/me?date=bad')).status).toBe(400);
  });
});
