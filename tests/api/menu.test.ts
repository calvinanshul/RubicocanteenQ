import { describe, expect, it } from 'vitest';
import { dbDate } from '@/server/adapters/clock';
import { agentFor, dishId, expectErrorShape, ist, prisma } from './helpers';

// Test clock: Tue 8 Jan 2030, 09:00 IST (far from the seeded real-date menus)
const NOW = ist('2030-01-08T09:00:00');

describe('menu items (M1)', () => {
  it('lists active dishes for the manager', async () => {
    const { agent } = await agentFor('MANAGER');
    const res = await agent.get('/api/menu-items');
    expect(res.status).toBe(200);
    const names = (res.body as { name: string }[]).map((d) => d.name);
    expect(names).toEqual(expect.arrayContaining(['Veg Biryani', 'Masala Chaas']));
  });
});

describe('daily menu', () => {
  it('TC-API-MENU-05 publishes a menu that employees see with remaining = quantity', async () => {
    const { agent: manager } = await agentFor('MANAGER');
    const entries = [
      { menuItemId: await dishId('Veg Biryani'), quantity: 80 },
      { menuItemId: await dishId('Dal Tadka + Rice'), quantity: 60 },
      { menuItemId: await dishId('Curd Rice'), quantity: 40 },
    ];
    const put = await manager.put('/api/daily-menu/2030-01-09').set('x-test-now', NOW).send({ entries });
    expect(put.status).toBe(200);

    const { agent: employee } = await agentFor('EMPLOYEE');
    const res = await employee.get('/api/daily-menu?date=2030-01-09').set('x-test-now', NOW);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      date: '2030-01-09',
      closed: false,
      orderingOpen: true,
      cutoff: '11:00',
      pickupLocation: 'Building 4 · Counter A',
    });
    expect(res.body.items).toHaveLength(3);
    for (const item of res.body.items as { quantity: number; remaining: number; ordered: number }[]) {
      expect(item.remaining).toBe(item.quantity);
      expect(item.ordered).toBe(0);
    }
  });

  it('replaces the menu: removed dishes without orders disappear', async () => {
    const { agent } = await agentFor('MANAGER');
    const a = await dishId('Veg Biryani');
    const b = await dishId('Curd Rice');
    await agent.put('/api/daily-menu/2030-01-10').set('x-test-now', NOW).send({ entries: [{ menuItemId: a, quantity: 10 }, { menuItemId: b, quantity: 5 }] }).expect(200);
    const res = await agent.put('/api/daily-menu/2030-01-10').set('x-test-now', NOW).send({ entries: [{ menuItemId: a, quantity: 12 }] });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ menuItemId: a, quantity: 12 });
  });

  it('TC-API-MENU-06 refuses a quantity below what is already ordered', async () => {
    const { agent } = await agentFor('MANAGER');
    const menuItemId = await dishId('Chicken Curry');
    await prisma.dailyMenuItem.create({ data: { menuDate: dbDate('2030-01-11'), menuItemId, quantity: 30, orderedQty: 25 } });
    const res = await agent.put('/api/daily-menu/2030-01-11').set('x-test-now', NOW).send({ entries: [{ menuItemId, quantity: 20 }] });
    expect(res.status).toBe(409);
    expectErrorShape(res.body, 'QTY_BELOW_ORDERED');
    expect(res.body.error.message).toBe("Quantity can't be lower than already ordered (25)");
    expect(res.body.error.fields['entries.0.quantity']).toMatch(/25/);
    const row = await prisma.dailyMenuItem.findFirstOrThrow({ where: { menuDate: dbDate('2030-01-11'), menuItemId } });
    expect(row.quantity).toBe(30);
  });

  it.each([
    ['quantity 0', { entries: [{ menuItemId: 1, quantity: 0 }] }],
    ['quantity -1', { entries: [{ menuItemId: 1, quantity: -1 }] }],
    ['quantity 1.5', { entries: [{ menuItemId: 1, quantity: 1.5 }] }],
    ['duplicate item', { entries: [{ menuItemId: 1, quantity: 5 }, { menuItemId: 1, quantity: 6 }] }],
  ])('TC-API-MENU-07 rejects %s with 400', async (_label, body) => {
    const { agent } = await agentFor('MANAGER');
    const res = await agent.put('/api/daily-menu/2030-01-14').set('x-test-now', NOW).send(body);
    expect(res.status).toBe(400);
    expectErrorShape(res.body, 'VALIDATION_ERROR');
  });

  it('TC-API-MENU-07 rejects a past date with 400', async () => {
    const { agent } = await agentFor('MANAGER');
    const res = await agent
      .put('/api/daily-menu/2030-01-07')
      .set('x-test-now', NOW)
      .send({ entries: [{ menuItemId: await dishId('Curd Rice'), quantity: 5 }] });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Cannot change menu for a past date');
  });

  it('rejects an unknown dish id', async () => {
    const { agent } = await agentFor('MANAGER');
    const res = await agent.put('/api/daily-menu/2030-01-16').set('x-test-now', NOW).send({ entries: [{ menuItemId: 999999, quantity: 5 }] });
    expect(res.status).toBe(400);
    expect(res.body.error.fields['entries.0.menuItemId']).toBeDefined();
  });

  it('TC-API-MENU-08 not published → 422; Sunday → closed', async () => {
    const { agent } = await agentFor('EMPLOYEE');
    const none = await agent.get('/api/daily-menu?date=2030-01-15').set('x-test-now', NOW);
    expect(none.status).toBe(422);
    expectErrorShape(none.body, 'MENU_NOT_PUBLISHED');
    const sunday = await agent.get('/api/daily-menu?date=2030-01-13').set('x-test-now', NOW);
    expect(sunday.status).toBe(200);
    expect(sunday.body.closed).toBe(true);
    expect(sunday.body.orderingOpen).toBe(false);
  });

  it('reports ordering closed after the cut-off', async () => {
    const { agent: manager } = await agentFor('MANAGER');
    await manager.put('/api/daily-menu/2030-01-08').set('x-test-now', NOW).send({ entries: [{ menuItemId: await dishId('Masala Chaas'), quantity: 100 }] }).expect(200);
    const { agent } = await agentFor('EMPLOYEE');
    const before = await agent.get('/api/daily-menu?date=2030-01-08').set('x-test-now', ist('2030-01-08T10:59:59'));
    const after = await agent.get('/api/daily-menu?date=2030-01-08').set('x-test-now', ist('2030-01-08T11:00:00'));
    expect(before.body.orderingOpen).toBe(true);
    expect(after.body.orderingOpen).toBe(false);
  });
});
