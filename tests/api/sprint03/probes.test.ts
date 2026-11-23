/** Sprint 03 cycle 1 tester probes (EC-03-13..EC-03-21). */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { sprintActive } from '../../sprintGate';
import { agentFor, app, at, createUser, insertOrder, prisma, seedDailyItem } from '../helpers';

type Status = 'PLACED' | 'PREPARING' | 'READY' | 'COLLECTED' | 'CANCELLED' | 'NO_SHOW';
async function orderOn(date: string, status: Status = 'PLACED', slotStart = '13:00', name = 'Probe Person') {
  const dish = await seedDailyItem({ date, quantity: 100 });
  const user = await createUser({ name });
  return insertOrder({ userId: user.id, date, slotStart, status, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1, name: dish.name, pricePaise: dish.pricePaise }] });
}

describe.skipIf(!sprintActive(3))('Sprint 03 · tester probes', () => {
  it('EC-03-13 the queue defaults to today on the server clock', async () => {
    const date = '2030-05-01'; // Wed
    const order = await orderOn(date);
    const { agent } = await agentFor('STAFF');
    const res = await agent.get('/api/orders').set('x-test-now', at(date, '12:40'));
    expect(res.status).toBe(200);
    expect(res.body.date).toBe(date);
    expect(res.body.slots.flatMap((s: { orders: { id: number }[] }) => s.orders.map((o) => o.id))).toContain(order.id);
  });

  it('EC-03-14 "Issues" filter returns cancelled and no-show orders only; ALL counts every order', async () => {
    const date = '2030-05-02';
    for (const s of ['PLACED', 'CANCELLED', 'NO_SHOW', 'COLLECTED'] as const) await orderOn(date, s);
    const { agent } = await agentFor('STAFF');
    const res = await agent.get(`/api/orders?date=${date}&status=ISSUES`);
    const statuses = res.body.slots.flatMap((s: { orders: { status: string }[] }) => s.orders.map((o) => o.status)).sort();
    expect(statuses).toEqual(['CANCELLED', 'NO_SHOW']);
    expect(res.body.counts.ALL).toBe(4);
  });

  it('EC-03-15 no-show is refused before the slot ends and accepted after', async () => {
    const date = '2030-05-03';
    const order = await orderOn(date, 'READY', '13:00');
    const { agent } = await agentFor('STAFF');
    const early = await agent.patch(`/api/orders/${order.id}/status`).set('x-test-now', at(date, '13:10')).send({ status: 'NO_SHOW' });
    expect(early.status).toBe(409);
    const late = await agent.patch(`/api/orders/${order.id}/status`).set('x-test-now', at(date, '13:15')).send({ status: 'NO_SHOW' });
    expect(late.status).toBe(200);
  });

  it('EC-03-16 "Already collected at HH:MM" uses IST time', async () => {
    const date = '2030-05-06';
    const order = await orderOn(date, 'READY');
    const { agent } = await agentFor('STAFF');
    await agent.post(`/api/orders/${order.id}/collect`).set('x-test-now', at(date, '13:04')).expect(200);
    const v = await agent.post('/api/orders/verify').set('x-test-now', at(date, '13:10')).send({ pickupCode: order.pickupCode });
    expect(v.body.error.message).toBe('Already collected at 13:04');
  });

  it('EC-03-17 status changes and hand-overs are written to the audit log', async () => {
    const date = '2030-05-07';
    const order = await orderOn(date);
    const { agent, user } = await agentFor('STAFF');
    await agent.patch(`/api/orders/${order.id}/status`).send({ status: 'PREPARING' }).expect(200);
    await agent.post(`/api/orders/${order.id}/collect`).set('x-test-now', at(date, '13:05')).expect(200);
    const logs = await prisma.auditLog.findMany({ where: { entity: 'Order', entityId: order.id }, orderBy: { id: 'asc' } });
    expect(logs.map((l) => l.after)).toEqual([{ status: 'PREPARING' }, { status: 'COLLECTED' }]);
    expect(logs.every((l) => l.actorId === user.id)).toBe(true);
  });

  it('EC-03-18 the employee pass shows COLLECTED with the collection time', async () => {
    const date = '2030-05-08';
    const dish = await seedDailyItem({ date, quantity: 10 });
    const { agent: emp, user } = await agentFor('EMPLOYEE');
    const order = await insertOrder({ userId: user.id, date, status: 'READY', items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1, name: dish.name, pricePaise: dish.pricePaise }] });
    const { agent: staff } = await agentFor('STAFF');
    await staff.post(`/api/orders/${order.id}/collect`).set('x-test-now', at(date, '13:02')).expect(200);
    const res = await emp.get(`/api/orders/${order.id}`);
    expect(res.body.status).toBe('COLLECTED');
    expect(res.body.collectedAt).not.toBeNull();
    expect(res.body.cancellable).toBe(false);
  });

  it('EC-03-19 collectedPct to one decimal, average rounded, negative vs-yesterday', async () => {
    const today = '2030-05-14'; // Tue
    const prev = '2030-05-13'; // Mon
    for (const s of ['COLLECTED', 'PLACED', 'PLACED'] as const) await orderOn(today, s);
    for (let i = 0; i < 6; i++) await orderOn(prev, 'COLLECTED');
    const { agent } = await agentFor('MANAGER');
    const res = await agent.get(`/api/reports/dashboard?date=${today}`);
    expect(res.body.kpis.collectedPct).toBe(33.3);
    expect(res.body.kpis.vsYesterdayPct).toBe(-50);
    expect(Number.isInteger(res.body.kpis.avgOrderPaise)).toBe(true);
  });

  it('EC-03-20 an employee name with HTML comes back as plain text in the queue', async () => {
    const date = '2030-05-15';
    await orderOn(date, 'PLACED', '13:00', '<img src=x onerror=alert(1)>');
    const { agent } = await agentFor('STAFF');
    const res = await agent.get(`/api/orders?date=${date}`);
    expect(res.body.slots[0].orders[0].employeeName).toBe('<img src=x onerror=alert(1)>');
  });

  it('EC-03-21 staff endpoints without a session → 401', async () => {
    for (const [m, p] of [['get', '/api/orders'], ['post', '/api/orders/verify'], ['patch', '/api/orders/1/status'], ['post', '/api/orders/1/collect'], ['get', '/api/reports/prep-list'], ['get', '/api/reports/dashboard']] as const) {
      expect((await request(app)[m](p).send({})).status, p).toBe(401);
    }
  });
});
