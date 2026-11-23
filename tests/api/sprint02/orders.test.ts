/**
 * Sprint 02 acceptance scripts: place, view and cancel orders (US-08..US-11, US-19).
 * Cases: docs/test-cases/features/ (Sprint S02 rows).
 */
import { PNG } from 'pngjs';
import jsQRImport from 'jsqr';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { sprintActive } from '../../sprintGate';
import {
  agentFor,
  app,
  at,
  createUser,
  expectErrorShape,
  PICKUP_CODE_RE,
  placeOrder,
  prisma,
  remaining,
  seedDailyItem,
  TEST_PASSWORD,
  withSettings,
} from '../helpers';

type JsQR = (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;
// jsqr is CommonJS; under NodeNext the callable may sit on .default
const jsQR = ((jsQRImport as unknown as { default?: JsQR }).default ?? jsQRImport) as unknown as JsQR;

const TODAY = '2030-03-05'; // Tue
const TOMORROW = '2030-03-06'; // Wed
const DAY_AFTER = '2030-03-07'; // Thu
const SATURDAY = '2030-03-09';
const AT_1015 = at(TODAY, '10:15');

describe.skipIf(!sprintActive(2))('Sprint 02 · place order (O1)', () => {
  it('TC-API-ORD-01 places a valid order and deducts stock', async () => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 10, pricePaise: 12000 });
    const { agent } = await agentFor('EMPLOYEE');
    const res = await placeOrder(agent, { date: TODAY, slotStart: '13:00', items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 2 }] }, AT_1015);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: 'PLACED',
      date: TODAY,
      slotStart: '13:00',
      slotEnd: '13:15',
      totalPaise: 24000,
      pickupLocation: 'Building 4 · Counter A',
      items: [{ name: dish.name, qty: 2, unitPricePaise: 12000 }],
    });
    expect(res.body.pickupCode).toMatch(PICKUP_CODE_RE);
    expect(typeof res.body.createdAt).toBe('string');
    expect(await remaining(dish.dailyMenuItemId)).toBe(8);
    const menu = await agent.get(`/api/daily-menu?date=${TODAY}`).set('x-test-now', AT_1015);
    expect(menu.body.items.find((i: { dailyMenuItemId: number }) => i.dailyMenuItemId === dish.dailyMenuItemId)?.remaining).toBe(8);
  });

  it.each(['11:00:00', '11:00:05'])('TC-API-ORD-02 refuses an order at %s (cut-off)', async (time) => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 10 });
    const { agent, user } = await agentFor('EMPLOYEE');
    const res = await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, `${TODAY}T${time}+05:30`);
    expect(res.status).toBe(409);
    expectErrorShape(res.body, 'CUTOFF_PASSED');
    expect(await prisma.order.count({ where: { userId: user.id } })).toBe(0);
    expect(await remaining(dish.dailyMenuItemId)).toBe(10);
  });

  it('TC-API-ORD-03 refuses more than is left and deducts nothing', async () => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 5, orderedQty: 4 });
    const { agent } = await agentFor('EMPLOYEE');
    const res = await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 2 }] }, AT_1015);
    expect(res.status).toBe(409);
    expectErrorShape(res.body, 'OUT_OF_STOCK');
    expect(res.body.error.message).toContain(dish.name);
    expect(await remaining(dish.dailyMenuItemId)).toBe(1);
  });

  it('TC-API-ORD-04 one active order per day', async () => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 10 });
    const { agent } = await agentFor('EMPLOYEE');
    await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, AT_1015).expect(201);
    const second = await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, AT_1015);
    expect(second.status).toBe(409);
    expectErrorShape(second.body, 'ORDER_EXISTS_FOR_DATE');
    expect(await remaining(dish.dailyMenuItemId)).toBe(9);
  });

  it('TC-API-ORD-04b a new order is allowed once the previous one is collected, not before', async () => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 10 });
    const { agent } = await agentFor('EMPLOYEE');
    const first = await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, AT_1015).expect(201);

    for (const status of ['PREPARING', 'READY'] as const) {
      await prisma.order.update({ where: { id: first.body.id }, data: { status } });
      const blocked = await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, AT_1015);
      expect(blocked.status).toBe(409);
      expectErrorShape(blocked.body, 'ORDER_EXISTS_FOR_DATE');
    }

    await prisma.order.update({ where: { id: first.body.id }, data: { status: 'COLLECTED', collectedAt: new Date() } });
    const again = await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, AT_1015);
    expect(again.status).toBe(201);
    expect(again.body.id).not.toBe(first.body.id);
    expect(await remaining(dish.dailyMenuItemId)).toBe(8);
  });

  it.each([
    ['qty 6', { items: [{ qty: 6 }] }, 'items.0.qty'],
    ['qty 0', { items: [{ qty: 0 }] }, 'items.0.qty'],
    ['qty -3', { items: [{ qty: -3 }] }, 'items.0.qty'],
    ['qty 2.5', { items: [{ qty: 2.5 }] }, 'items.0.qty'],
    ['empty cart', { items: [] }, 'items'],
    ['missing slotStart', { slotStart: undefined }, 'slotStart'],
  ])('TC-API-ORD-05 validates %s without the UI', async (_label, override, field) => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 10 });
    const { agent } = await agentFor('EMPLOYEE');
    const items = 'items' in override ? (override.items as { qty: number }[]).map((i) => ({ dailyMenuItemId: dish.dailyMenuItemId, ...i })) : [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }];
    const body: Record<string, unknown> = { date: TODAY, slotStart: '13:00', items };
    if ('slotStart' in override) delete body.slotStart;
    const res = await agent.post('/api/orders').set('x-test-now', AT_1015).set('Idempotency-Key', crypto.randomUUID()).send(body);
    expect(res.status).toBe(400);
    expectErrorShape(res.body, 'VALIDATION_ERROR');
    expect(res.body.error.fields[field]).toBeDefined();
  });

  it.each(['12:10', '15:00', '14:30', '12:00'])('TC-API-ORD-06 refuses slot %s', async (slotStart) => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 10 });
    const { agent } = await agentFor('EMPLOYEE');
    const res = await placeOrder(agent, { date: TODAY, slotStart, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, AT_1015);
    expect(res.status).toBe(400);
  });

  it('TC-API-ORD-07 the same Idempotency-Key returns the same order once', async () => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 10 });
    const { agent, user } = await agentFor('EMPLOYEE');
    const key = crypto.randomUUID();
    const body = { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] };
    const first = await placeOrder(agent, body, AT_1015, key);
    const second = await placeOrder(agent, body, AT_1015, key);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(await prisma.order.count({ where: { userId: user.id } })).toBe(1);
    expect(await remaining(dish.dailyMenuItemId)).toBe(9);
  });

  it('TC-API-ORD-08 date and item scope', async () => {
    const today = await seedDailyItem({ date: TODAY, quantity: 10 });
    const other = await seedDailyItem({ date: TOMORROW, quantity: 10 });
    const { agent } = await agentFor('EMPLOYEE');
    await seedDailyItem({ date: DAY_AFTER, quantity: 10 });
    for (const date of [DAY_AFTER, '2030-03-04']) {
      const res = await placeOrder(agent, { date, items: [{ dailyMenuItemId: today.dailyMenuItemId, qty: 1 }] }, AT_1015);
      expect(res.status, date).toBe(400);
    }
    const wrongItem = await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: other.dailyMenuItemId, qty: 1 }] }, AT_1015);
    expect(wrongItem.status).toBe(400);
  });

  it('TC-API-ORD-09 concurrency: exactly one of 10 parallel orders gets the last portion', async () => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 1 });
    const agents = await Promise.all(Array.from({ length: 10 }, () => agentFor('EMPLOYEE')));
    const results = await Promise.all(
      agents.map(({ agent }) => placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, AT_1015)),
    );
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(9);
    for (const r of results.filter((x) => x.status === 409)) expectErrorShape(r.body, 'OUT_OF_STOCK');
    expect(await remaining(dish.dailyMenuItemId)).toBe(0);
  });

  it('TC-API-ORD-15 refuses a closed weekday and a holiday', async () => {
    const sat = await seedDailyItem({ date: SATURDAY, quantity: 10 });
    const { agent } = await agentFor('EMPLOYEE');
    const r1 = await placeOrder(agent, { date: SATURDAY, items: [{ dailyMenuItemId: sat.dailyMenuItemId, qty: 1 }] }, at('2030-03-08', '10:00'));
    expect(r1.status).toBe(422);
    expectErrorShape(r1.body, 'CANTEEN_CLOSED');

    const holiday = '2030-03-13';
    const dish = await seedDailyItem({ date: holiday, quantity: 10 });
    await prisma.closedDate.upsert({ where: { date: new Date(`${holiday}T00:00:00Z`) }, update: {}, create: { date: new Date(`${holiday}T00:00:00Z`), reason: 'Holiday' } });
    const r2 = await placeOrder(agent, { date: holiday, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, at('2030-03-13', '09:00'));
    expect(r2.status).toBe(422);
    expectErrorShape(r2.body, 'CANTEEN_CLOSED');
  });

  it('TC-API-ORD-16 a full slot is refused and shown as unavailable', async () => {
    const restore = await withSettings({ slotCapacity: 2 });
    try {
      const date = '2030-03-12';
      const dish = await seedDailyItem({ date, quantity: 50 });
      const now = at(date, '09:00');
      for (let i = 0; i < 2; i++) {
        const { agent } = await agentFor('EMPLOYEE');
        await placeOrder(agent, { date, slotStart: '13:00', items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, now).expect(201);
      }
      const { agent } = await agentFor('EMPLOYEE');
      const third = await placeOrder(agent, { date, slotStart: '13:00', items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, now);
      expect(third.status).toBe(409);
      expectErrorShape(third.body, 'SLOT_FULL');
      expect(await remaining(dish.dailyMenuItemId)).toBe(48);
      const slots = await agent.get(`/api/slots?date=${date}`).set('x-test-now', now);
      expect(slots.status).toBe(200);
      expect(slots.body.find((s: { start: string }) => s.start === '13:00')).toMatchObject({ booked: 2, capacity: 2, available: false });
    } finally {
      await restore();
    }
  });
});

describe.skipIf(!sprintActive(2))('Sprint 02 · order edge cases', () => {
  it('EC-02-01 the maximum quantity (5) is accepted', async () => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 10 });
    const { agent } = await agentFor('EMPLOYEE');
    const res = await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 5 }] }, AT_1015);
    expect(res.status).toBe(201);
  });

  it('EC-02-02 an order at 10:59:59 is accepted', async () => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 10 });
    const { agent } = await agentFor('EMPLOYEE');
    const res = await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, `${TODAY}T10:59:59+05:30`);
    expect(res.status).toBe(201);
  });

  it("EC-02-03 tomorrow can still be ordered after today's cut-off", async () => {
    const dish = await seedDailyItem({ date: TOMORROW, quantity: 10 });
    const { agent } = await agentFor('EMPLOYEE');
    const res = await placeOrder(agent, { date: TOMORROW, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, at(TODAY, '16:30'));
    expect(res.status).toBe(201);
  });

  it.each(['STAFF', 'MANAGER', 'ADMIN'] as const)('EC-02-04 %s cannot place orders', async (role) => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 10 });
    const { agent } = await agentFor(role);
    const res = await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, AT_1015);
    expect(res.status).toBe(403);
  });

  it("EC-02-05 another user's Idempotency-Key never returns someone else's order", async () => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 10 });
    const a = await agentFor('EMPLOYEE');
    const b = await agentFor('EMPLOYEE');
    const key = crypto.randomUUID();
    const first = await placeOrder(a.agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, AT_1015, key);
    const second = await placeOrder(b.agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, AT_1015, key);
    expect(first.status).toBe(201);
    expect(second.body?.id === first.body.id).toBe(false);
    expect(second.body?.pickupCode === first.body.pickupCode).toBe(false);
  });

  it('EC-02-06 a date without a published menu → 422 MENU_NOT_PUBLISHED', async () => {
    // Wed 20 Mar 2030 09:00, ordering for Thu 21 Mar (no script ever publishes that date)
    const elsewhere = await seedDailyItem({ date: '2030-03-20', quantity: 10 });
    const { agent } = await agentFor('EMPLOYEE');
    const res = await placeOrder(agent, { date: '2030-03-21', items: [{ dailyMenuItemId: elsewhere.dailyMenuItemId, qty: 1 }] }, at('2030-03-20', '09:00'));
    expect(res.status).toBe(422);
    expectErrorShape(res.body, 'MENU_NOT_PUBLISHED');
  });

  it('EC-02-07 an unknown dailyMenuItemId → 400', async () => {
    const { agent } = await agentFor('EMPLOYEE');
    const res = await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: 99999999, qty: 1 }] }, AT_1015);
    expect(res.status).toBe(400);
  });

  it('EC-02-08 the first slot (12:30) and the last slot (14:15) are accepted', async () => {
    for (const slotStart of ['12:30', '14:15']) {
      const dish = await seedDailyItem({ date: TODAY, quantity: 10 });
      const { agent } = await agentFor('EMPLOYEE');
      const res = await placeOrder(agent, { date: TODAY, slotStart, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, AT_1015);
      expect(res.status, slotStart).toBe(201);
    }
  });

  it('EC-02-09 multi-item order is atomic: one item out of stock deducts nothing', async () => {
    const plenty = await seedDailyItem({ date: TODAY, quantity: 10 });
    const scarce = await seedDailyItem({ date: TODAY, quantity: 1 });
    const { agent } = await agentFor('EMPLOYEE');
    const res = await placeOrder(
      agent,
      { date: TODAY, items: [{ dailyMenuItemId: plenty.dailyMenuItemId, qty: 2 }, { dailyMenuItemId: scarce.dailyMenuItemId, qty: 2 }] },
      AT_1015,
    );
    expect(res.status).toBe(409);
    expect(await remaining(plenty.dailyMenuItemId)).toBe(10);
    expect(await remaining(scarce.dailyMenuItemId)).toBe(1);
  });

  it('EC-02-10 totals are exact integer paise across items', async () => {
    const a = await seedDailyItem({ date: TODAY, quantity: 10, pricePaise: 3333 });
    const b = await seedDailyItem({ date: TODAY, quantity: 10, pricePaise: 2550 });
    const { agent } = await agentFor('EMPLOYEE');
    const res = await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: a.dailyMenuItemId, qty: 3 }, { dailyMenuItemId: b.dailyMenuItemId, qty: 1 }] }, AT_1015);
    expect(res.status).toBe(201);
    expect(res.body.totalPaise).toBe(3 * 3333 + 2550);
  });

  it('EC-02-11 slot capacity holds under concurrency', async () => {
    const restore = await withSettings({ slotCapacity: 1 });
    try {
      const date = '2030-03-14';
      const dish = await seedDailyItem({ date, quantity: 50 });
      const agents = await Promise.all(Array.from({ length: 5 }, () => agentFor('EMPLOYEE')));
      const results = await Promise.all(
        agents.map(({ agent }) => placeOrder(agent, { date, slotStart: '13:30', items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, at(date, '09:00'))),
      );
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(results.filter((r) => r.status === 409)).toHaveLength(4);
      expect(await remaining(dish.dailyMenuItemId)).toBe(49);
    } finally {
      await restore();
    }
  });

  it('EC-02-12 pickup codes are unique across many orders', async () => {
    const dish = await seedDailyItem({ date: TODAY, quantity: 100 });
    const codes: string[] = [];
    for (let i = 0; i < 25; i++) {
      const { agent } = await agentFor('EMPLOYEE');
      const res = await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, AT_1015);
      codes.push(res.body.pickupCode);
    }
    expect(new Set(codes).size).toBe(25);
  });

  it('EC-02-13 non-numeric order id → 400 or 404, never 500', async () => {
    const { agent } = await agentFor('EMPLOYEE');
    for (const id of ['abc', '-1', '1.5', '99999999999999999999']) {
      const res = await agent.get(`/api/orders/${id}`);
      expect([400, 404], id).toContain(res.status);
    }
  });

  it('EC-02-14 unauthenticated order calls → 401', async () => {
    for (const [method, path] of [['post', '/api/orders'], ['get', '/api/orders/me'], ['get', '/api/orders/1'], ['get', '/api/slots?date=2030-03-05']] as const) {
      const res = await request(app)[method](path).send({});
      expect(res.status, path).toBe(401);
    }
  });
});

describe.skipIf(!sprintActive(2))('Sprint 02 · slots (M6)', () => {
  it('lists 8 slots with booked / capacity / available', async () => {
    const { agent } = await agentFor('EMPLOYEE');
    const res = await agent.get('/api/slots?date=2030-03-19').set('x-test-now', at('2030-03-19', '09:00'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(8);
    expect(res.body[0]).toMatchObject({ start: '12:30', end: '12:45', booked: 0, capacity: 30, available: true });
  });

  it('rejects a bad date', async () => {
    const { agent } = await agentFor('EMPLOYEE');
    expect((await agent.get('/api/slots?date=2030-13-01')).status).toBe(400);
  });
});

describe.skipIf(!sprintActive(2))('Sprint 02 · pass, QR and cancel (O3–O5)', () => {
  async function placed(time = AT_1015, qty = 2) {
    const dish = await seedDailyItem({ date: TODAY, quantity: 10 });
    const owner = await agentFor('EMPLOYEE');
    const res = await placeOrder(owner.agent, { date: TODAY, slotStart: '13:00', items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty }] }, time);
    expect(res.status).toBe(201);
    return { dish, owner, order: res.body as { id: number; pickupCode: string } };
  }

  it('O3 the owner reads the order with snapshot names and pickup details', async () => {
    const { owner, order, dish } = await placed();
    const res = await owner.agent.get(`/api/orders/${order.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: order.id, status: 'PLACED', pickupCode: order.pickupCode, slotEnd: '13:15', pickupLocation: 'Building 4 · Counter A' });
    expect(res.body.items[0].name).toBe(dish.name);
  });

  it('TC-API-ORD-14 the QR encodes only the pickup code', async () => {
    const { owner, order } = await placed();
    const res = await owner.agent.get(`/api/orders/${order.id}/qr`).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on('data', (c: Buffer) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/png/);
    expect(String(res.headers['cache-control'])).toMatch(/private/);
    const png = PNG.sync.read(res.body as Buffer);
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(decoded?.data).toBe(order.pickupCode);
  });

  it('TC-API-RBAC-04 another employee gets 404 for GET, QR and cancel', async () => {
    const { order, dish } = await placed();
    const { agent: other } = await agentFor('EMPLOYEE');
    expect((await other.get(`/api/orders/${order.id}`)).status).toBe(404);
    expect((await other.get(`/api/orders/${order.id}/qr`)).status).toBe(404);
    expect((await other.post(`/api/orders/${order.id}/cancel`).set('x-test-now', AT_1015)).status).toBe(404);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PLACED');
    expect(await remaining(dish.dailyMenuItemId)).toBe(8);
  });

  it('TC-API-ORD-10 cancelling before the cut-off restores stock', async () => {
    const { owner, order, dish } = await placed(at(TODAY, '10:00'));
    const res = await owner.agent.post(`/api/orders/${order.id}/cancel`).set('x-test-now', at(TODAY, '10:40'));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');
    expect(await remaining(dish.dailyMenuItemId)).toBe(10);
  });

  it('TC-API-ORD-11 cancel after the cut-off, twice, or for someone else is refused', async () => {
    const late = await placed(at(TODAY, '10:00'));
    const r1 = await late.owner.agent.post(`/api/orders/${late.order.id}/cancel`).set('x-test-now', at(TODAY, '11:05'));
    expect(r1.status).toBe(409);
    expectErrorShape(r1.body, 'CUTOFF_PASSED');

    const twice = await placed(at(TODAY, '10:00'));
    await twice.owner.agent.post(`/api/orders/${twice.order.id}/cancel`).set('x-test-now', at(TODAY, '10:30')).expect(200);
    const r2 = await twice.owner.agent.post(`/api/orders/${twice.order.id}/cancel`).set('x-test-now', at(TODAY, '10:31'));
    expect(r2.status).toBe(409);
    expectErrorShape(r2.body, 'INVALID_STATUS');
    expect(await remaining(twice.dish.dailyMenuItemId)).toBe(10); // EC-02-15: no double restore
  });

  it('TC-API-ORD-12 re-ordering after a cancel is allowed the same day', async () => {
    const { owner, order, dish } = await placed(at(TODAY, '10:00'));
    await owner.agent.post(`/api/orders/${order.id}/cancel`).set('x-test-now', at(TODAY, '10:10')).expect(200);
    const again = await placeOrder(owner.agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, at(TODAY, '10:20'));
    expect(again.status).toBe(201);
  });

  it('EC-02-16 a READY order cannot be cancelled by the employee', async () => {
    const { owner, order } = await placed();
    await prisma.order.update({ where: { id: order.id }, data: { status: 'READY' } });
    const res = await owner.agent.post(`/api/orders/${order.id}/cancel`).set('x-test-now', AT_1015);
    expect(res.status).toBe(409);
    expectErrorShape(res.body, 'INVALID_STATUS');
  });

  it('EC-02-17 a deactivated employee cannot read their order any more', async () => {
    const user = await createUser();
    const dish = await seedDailyItem({ date: TODAY, quantity: 10 });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD }).expect(200);
    const res = await placeOrder(agent, { date: TODAY, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, AT_1015);
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    expect((await agent.get(`/api/orders/${res.body.id}`)).status).toBe(401);
  });
});
