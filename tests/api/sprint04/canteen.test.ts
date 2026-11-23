/**
 * Sprint 04 acceptance scripts: menu catalogue, users, settings, history, exports, RBAC matrix
 * (US-04, US-05, US-06, US-11 AC3/5, US-17, US-03). Cases: docs/test-cases/features/ (Sprint S04 rows).
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { sprintActive } from '../../sprintGate';
import {
  agentFor,
  app,
  at,
  createUser,
  expectErrorShape,
  insertOrder,
  placeOrder,
  prisma,
  seedDailyItem,
  TEST_PASSWORD,
  uniqueEmail,
  withSettings,
} from '../helpers';

const VALID_SETTINGS = {
  orderCutoff: '11:00',
  slotStart: '12:30',
  slotEnd: '14:30',
  slotMinutes: 15,
  slotCapacity: 30,
  pickupLocation: 'Building 4 · Counter A',
  maxQtyPerItem: 5,
  allowedDomains: ['rubicotech.com'],
  closedWeekdays: [0, 6],
  noShowGraceMinutes: 30,
};

describe.skipIf(!sprintActive(4))('Sprint 04 · menu catalogue (M1–M3)', () => {
  it('TC-API-MENU-01 creates items, accepts COMBO/LIGHT, rejects unknown categories', async () => {
    const { agent } = await agentFor('MANAGER');
    for (const category of ['MAIN', 'COMBO', 'LIGHT']) {
      const res = await agent.post('/api/menu-items').send({ name: `Cat ${category} ${Date.now()}`, category, pricePaise: 12000, diet: 'VEG' });
      expect(res.status, category).toBe(201);
      expect(res.body).toMatchObject({ category, pricePaise: 12000, isActive: true });
    }
    expect((await agent.post('/api/menu-items').send({ name: `Cat X ${Date.now()}`, category: 'SNACK', pricePaise: 12000, diet: 'VEG' })).status).toBe(400);
  });

  it.each([
    ['price 0', { pricePaise: 0 }],
    ['price -5', { pricePaise: -500 }],
    ['price "abc"', { pricePaise: 'abc' }],
    ['price 100001', { pricePaise: 100001 }],
    ['price 12.5 paise', { pricePaise: 1250.5 }],
    ['empty name', { name: '' }],
    ['81-char name', { name: 'n'.repeat(81) }],
    ['301-char description', { description: 'd'.repeat(301) }],
    ['bad diet', { diet: 'VEGAN' }],
  ])('TC-API-MENU-02 rejects %s', async (_l, override) => {
    const { agent } = await agentFor('MANAGER');
    const res = await agent.post('/api/menu-items').send({ name: `Bad ${Date.now()}`, category: 'MAIN', pricePaise: 12000, diet: 'VEG', ...override });
    expect(res.status).toBe(400);
    expectErrorShape(res.body, 'VALIDATION_ERROR');
  });

  it('TC-API-MENU-03 duplicate names are refused case-insensitively (create and rename)', async () => {
    const { agent } = await agentFor('MANAGER');
    const name = `Dup Dish ${Date.now()}`;
    const first = await agent.post('/api/menu-items').send({ name, category: 'MAIN', pricePaise: 12000, diet: 'VEG' });
    const dup = await agent.post('/api/menu-items').send({ name: name.toLowerCase(), category: 'MAIN', pricePaise: 12000, diet: 'VEG' });
    expect(dup.status).toBe(409);
    expectErrorShape(dup.body, 'DUPLICATE_NAME');
    const other = await agent.post('/api/menu-items').send({ name: `${name} Two`, category: 'MAIN', pricePaise: 12000, diet: 'VEG' });
    const rename = await agent.patch(`/api/menu-items/${other.body.id}`).send({ name: name.toUpperCase() });
    expect(rename.status).toBe(409);
    expect(first.status).toBe(201);
  });

  it('TC-API-MENU-04 price changes never alter existing orders (BR6)', async () => {
    const date = '2030-05-07';
    const dish = await seedDailyItem({ date, quantity: 10, pricePaise: 12000 });
    const { agent: emp } = await agentFor('EMPLOYEE');
    const placed = await placeOrder(emp, { date, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, at(date, '09:00'));
    const { agent: mgr } = await agentFor('MANAGER');
    await mgr.patch(`/api/menu-items/${dish.menuItemId}`).send({ pricePaise: 15000 }).expect(200);
    const order = await emp.get(`/api/orders/${placed.body.id}`);
    expect(order.body.totalPaise).toBe(12000);
    expect(order.body.items[0].unitPricePaise).toBe(12000);
    const { agent: emp2 } = await agentFor('EMPLOYEE');
    const next = await placeOrder(emp2, { date, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, at(date, '09:05'));
    expect(next.body.totalPaise).toBe(15000);
  });

  it('TC-API-MENU-09 archived items are hidden but old orders keep the name', async () => {
    const date = '2030-05-08';
    const dish = await seedDailyItem({ date, quantity: 10 });
    const { agent: emp, user } = await agentFor('EMPLOYEE');
    const placed = await placeOrder(emp, { date, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, at(date, '09:00'));
    const { agent: mgr } = await agentFor('MANAGER');
    await mgr.patch(`/api/menu-items/${dish.menuItemId}`).send({ isActive: false }).expect(200);
    const active = await mgr.get('/api/menu-items?active=true');
    expect(active.body.some((i: { id: number }) => i.id === dish.menuItemId)).toBe(false);
    const all = await mgr.get('/api/menu-items?active=false');
    expect(all.body.some((i: { id: number }) => i.id === dish.menuItemId)).toBe(true);
    expect((await emp.get(`/api/orders/${placed.body.id}`)).body.items[0].name).toBe(dish.name);
    expect(user.id).toBeGreaterThan(0);
  });

  it('EC-04-01 PATCH a missing item → 404; empty PATCH → 400 or 200 no-op, never 500', async () => {
    const { agent } = await agentFor('MANAGER');
    expect((await agent.patch('/api/menu-items/99999999').send({ pricePaise: 9000 })).status).toBe(404);
    const item = await agent.post('/api/menu-items').send({ name: `Noop ${Date.now()}`, category: 'MAIN', pricePaise: 9000, diet: 'VEG' });
    expect([200, 400]).toContain((await agent.patch(`/api/menu-items/${item.body.id}`).send({})).status);
  });

  it('TC-API-VAL-03 an HTML item name is stored and returned literally', async () => {
    const { agent } = await agentFor('MANAGER');
    const name = `<script>alert(1)</script> ${Date.now()}`;
    const res = await agent.post('/api/menu-items').send({ name, category: 'MAIN', pricePaise: 9000, diet: 'VEG' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe(name);
  });
});

describe.skipIf(!sprintActive(4))('Sprint 04 · users and roles (U1, U2)', () => {
  it('TC-API-USR-01 search and paginate (page size 20)', async () => {
    const tag = `ramtag${Date.now()}`;
    for (let i = 0; i < 22; i++) await createUser({ name: `Ram ${tag} ${i}`, email: uniqueEmail(tag) });
    const { agent } = await agentFor('ADMIN');
    const p1 = await agent.get(`/api/users?q=${tag}&page=1`);
    expect(p1.status).toBe(200);
    expect(p1.body).toMatchObject({ page: 1, pageSize: 20, total: 22 });
    expect(p1.body.items).toHaveLength(20);
    const p2 = await agent.get(`/api/users?q=${tag}&page=2`);
    expect(p2.body.items).toHaveLength(2);
    for (const u of p1.body.items) expect(JSON.stringify(u)).not.toMatch(/passwordHash/);
  });

  it('TC-API-USR-02 change role; /me reflects it', async () => {
    const user = await createUser();
    const { agent } = await agentFor('ADMIN');
    expect((await agent.patch(`/api/users/${user.id}`).send({ role: 'MANAGER' })).status).toBe(200);
    const self = request.agent(app);
    await self.post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD }).expect(200);
    expect((await self.get('/api/auth/me')).body.role).toBe('MANAGER');
  });

  it('TC-API-USR-03 deactivate blocks login', async () => {
    const user = await createUser();
    const { agent } = await agentFor('ADMIN');
    await agent.patch(`/api/users/${user.id}`).send({ isActive: false }).expect(200);
    expect((await request(app).post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD })).status).toBe(403);
  });

  it('TC-API-USR-04 the last active admin cannot demote or deactivate themselves', async () => {
    // Make the caller the only active admin for the duration of the test
    const others = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true } });
    await prisma.user.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { isActive: false } });
    try {
      const { agent, user } = await agentFor('ADMIN');
      const r1 = await agent.patch(`/api/users/${user.id}`).send({ role: 'EMPLOYEE' });
      expect(r1.status).toBe(409);
      expectErrorShape(r1.body, 'LAST_ADMIN');
      const r2 = await agent.patch(`/api/users/${user.id}`).send({ isActive: false });
      expect(r2.status).toBe(409);
      await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    } finally {
      await prisma.user.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { isActive: true } });
    }
  });

  it('TC-API-USR-05 unknown user → 404', async () => {
    const { agent } = await agentFor('ADMIN');
    expect((await agent.patch('/api/users/99999999').send({ role: 'STAFF' })).status).toBe(404);
  });

  it.each([
    ['unknown role', { role: 'OWNER' }],
    ['bad employee code', { employeeCode: 'x' }],
    ['non-boolean active', { isActive: 'no' }],
  ])('EC-04-02 rejects %s', async (_l, body) => {
    const user = await createUser();
    const { agent } = await agentFor('ADMIN');
    expect((await agent.patch(`/api/users/${user.id}`).send(body)).status).toBe(400);
  });

  it('EC-04-03 sets employeeCode and department', async () => {
    const user = await createUser();
    const { agent } = await agentFor('ADMIN');
    const res = await agent.patch(`/api/users/${user.id}`).send({ employeeCode: 'EMP-7777', department: 'Finance' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ employeeCode: 'EMP-7777', department: 'Finance' });
  });

  it('EC-04-04 search input is treated as text (no injection, no 500)', async () => {
    const { agent } = await agentFor('ADMIN');
    for (const q of ["' OR 1=1 --", '%', '_', '<b>x</b>']) {
      const res = await agent.get(`/api/users?q=${encodeURIComponent(q)}`);
      expect(res.status, q).toBe(200);
    }
    expect((await agent.get('/api/users?page=0')).status).toBe(400);
    expect((await agent.get('/api/users?role=CHEF')).status).toBe(400);
  });
});

describe.skipIf(!sprintActive(4))('Sprint 04 · settings and closed dates (S1–S5)', () => {
  it('TC-API-SET-01 saving settings changes the slots', async () => {
    const restore = await withSettings({});
    try {
      const { agent } = await agentFor('ADMIN');
      const res = await agent.put('/api/settings').send({ ...VALID_SETTINGS, slotStart: '12:00', slotEnd: '14:00', slotMinutes: 30 });
      expect(res.status).toBe(200);
      const slots = await agent.get('/api/slots?date=2030-05-14');
      expect(slots.body.map((s: { start: string }) => s.start)).toEqual(['12:00', '12:30', '13:00', '13:30']);
    } finally {
      await restore();
    }
  });

  it.each([
    ['end before start', { slotStart: '14:00', slotEnd: '13:00' }, 'slotEnd'],
    ['cut-off after first slot', { orderCutoff: '12:45' }, 'orderCutoff'],
    ['slot length 7', { slotMinutes: 7 }, 'slotMinutes'],
    ['capacity 0', { slotCapacity: 0 }, 'slotCapacity'],
    ['capacity 501', { slotCapacity: 501 }, 'slotCapacity'],
    ['81-char location', { pickupLocation: 'x'.repeat(81) }, 'pickupLocation'],
    ['bad domain', { allowedDomains: ['not a domain'] }, 'allowedDomains.0'],
    ['weekday 7', { closedWeekdays: [7] }, 'closedWeekdays.0'],
  ])('TC-API-SET-02 rejects %s', async (_l, override, field) => {
    const { agent } = await agentFor('ADMIN');
    const res = await agent.put('/api/settings').send({ ...VALID_SETTINGS, ...override });
    expect(res.status).toBe(400);
    expect(res.body.error.fields[field]).toBeDefined();
  });

  it('TC-API-SET-03 a cut-off change keeps existing orders and applies to new ones', async () => {
    const restore = await withSettings({});
    try {
      const date = '2030-05-15';
      const dish = await seedDailyItem({ date, quantity: 10 });
      const { agent: emp } = await agentFor('EMPLOYEE');
      const placed = await placeOrder(emp, { date, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, at(date, '10:00'));
      expect(placed.status).toBe(201);
      const { agent: admin } = await agentFor('ADMIN');
      await admin.put('/api/settings').send({ ...VALID_SETTINGS, orderCutoff: '09:00' }).expect(200);
      expect((await emp.get(`/api/orders/${placed.body.id}`)).body.status).toBe('PLACED');
      const { agent: emp2 } = await agentFor('EMPLOYEE');
      const late = await placeOrder(emp2, { date, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, at(date, '10:05'));
      expect(late.status).toBe(409);
      expectErrorShape(late.body, 'CUTOFF_PASSED');
    } finally {
      await restore();
    }
  });

  it('TC-API-SET-04 pickup location and capacity flow through menu, slots and orders', async () => {
    const restore = await withSettings({});
    try {
      const { agent: admin } = await agentFor('ADMIN');
      await admin.put('/api/settings').send({ ...VALID_SETTINGS, pickupLocation: 'Building 4 · Counter A', slotCapacity: 25 }).expect(200);
      const date = '2030-05-16';
      const dish = await seedDailyItem({ date, quantity: 10 });
      const { agent } = await agentFor('EMPLOYEE');
      expect((await agent.get(`/api/daily-menu?date=${date}`).set('x-test-now', at(date, '09:00'))).body.pickupLocation).toBe('Building 4 · Counter A');
      expect((await agent.get(`/api/slots?date=${date}`)).body[0].capacity).toBe(25);
      const order = await placeOrder(agent, { date, items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1 }] }, at(date, '09:00'));
      expect(order.body.pickupLocation).toBe('Building 4 · Counter A');
    } finally {
      await restore();
    }
  });

  it('TC-API-RBAC-03 staff and managers cannot change settings', async () => {
    for (const role of ['STAFF', 'MANAGER', 'EMPLOYEE'] as const) {
      const { agent } = await agentFor(role);
      expect((await agent.put('/api/settings').send(VALID_SETTINGS)).status, role).toBe(403);
    }
  });

  it('EC-04-05 closed dates: add, duplicate, list, delete, delete again', async () => {
    const { agent } = await agentFor('ADMIN');
    const date = '2030-05-21';
    expect((await agent.post('/api/closed-dates').send({ date, reason: 'Holiday' })).status).toBe(201);
    expect((await agent.post('/api/closed-dates').send({ date, reason: 'Again' })).status).toBe(409);
    const list = await agent.get('/api/closed-dates?from=2030-05-01&to=2030-05-31');
    expect(list.body).toEqual(expect.arrayContaining([expect.objectContaining({ date, reason: 'Holiday' })]));
    expect((await agent.delete(`/api/closed-dates/${date}`)).status).toBe(204);
    expect((await agent.delete(`/api/closed-dates/${date}`)).status).toBe(404);
    const { agent: mgr } = await agentFor('MANAGER');
    expect((await mgr.post('/api/closed-dates').send({ date, reason: 'x' })).status).toBe(403);
  });
});

describe.skipIf(!sprintActive(4))('Sprint 04 · my orders (O2)', () => {
  it('TC-API-ORD-13 newest first, 10 per page; a new user gets an empty list', async () => {
    const user = await createUser();
    const dish = await seedDailyItem({ date: '2030-06-03', quantity: 100 });
    for (let i = 0; i < 12; i++) {
      const date = `2030-06-${String(3 + i).padStart(2, '0')}`;
      await insertOrder({ userId: user.id, date, status: 'COLLECTED', items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1, name: dish.name, pricePaise: dish.pricePaise }] });
    }
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD }).expect(200);
    const p1 = await agent.get('/api/orders/me?page=1');
    expect(p1.status).toBe(200);
    expect(p1.body).toMatchObject({ page: 1, pageSize: 10, total: 12 });
    expect(p1.body.items).toHaveLength(10);
    expect(p1.body.items[0].date).toBe('2030-06-14');
    expect((await agent.get('/api/orders/me?page=2')).body.items).toHaveLength(2);
    const { agent: fresh } = await agentFor('EMPLOYEE');
    expect((await fresh.get('/api/orders/me')).body).toMatchObject({ items: [], total: 0 });
  });

  it("EC-04-06 my orders never include someone else's", async () => {
    const a = await agentFor('EMPLOYEE');
    const b = await agentFor('EMPLOYEE');
    const dish = await seedDailyItem({ date: '2030-06-17', quantity: 10 });
    await insertOrder({ userId: a.user.id, date: '2030-06-17', items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1, name: dish.name, pricePaise: dish.pricePaise }] });
    expect((await b.agent.get('/api/orders/me')).body.total).toBe(0);
  });
});

describe.skipIf(!sprintActive(4))('Sprint 04 · CSV exports (R3, R4)', () => {
  it('TC-API-RPT-03 orders CSV: headers, filename, range rules', async () => {
    const { agent } = await agentFor('MANAGER');
    const ok = await agent.get('/api/reports/orders.csv?from=2030-06-01&to=2030-06-30');
    expect(ok.status).toBe(200);
    expect(ok.headers['content-type']).toMatch(/text\/csv/);
    expect(ok.headers['content-disposition']).toContain('orders_2030-06-01_2030-06-30.csv');
    expect(ok.text.split(/\r?\n/)[0]).toBe('date,order_id,pickup_code,employee_name,employee_email,items,total_inr,status,slot');
    expect((await agent.get('/api/reports/orders.csv?from=2030-01-01&to=2030-04-30')).status).toBe(400); // 120 days
    expect((await agent.get('/api/reports/orders.csv?from=2030-06-30&to=2030-06-01')).status).toBe(400);
  });

  it('EC-04-07 92 days is allowed, 93 is not', async () => {
    const { agent } = await agentFor('ADMIN');
    expect((await agent.get('/api/reports/orders.csv?from=2030-01-01&to=2030-04-02')).status).toBe(200); // 92 days inclusive
    expect((await agent.get('/api/reports/orders.csv?from=2030-01-01&to=2030-04-03')).status).toBe(400);
  });

  it('TC-API-RPT-04 a formula in a name is escaped', async () => {
    const user = await createUser({ name: '=HYPERLINK("http://x")' });
    const dish = await seedDailyItem({ date: '2030-06-18', quantity: 10 });
    await insertOrder({ userId: user.id, date: '2030-06-18', items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1, name: dish.name, pricePaise: dish.pricePaise }] });
    const { agent } = await agentFor('MANAGER');
    const res = await agent.get('/api/reports/orders.csv?from=2030-06-18&to=2030-06-18');
    expect(res.text).toMatch(/'=HYPERLINK|"'=HYPERLINK/);
    expect(res.text).not.toMatch(/(^|,)=HYPERLINK/m);
  });

  it('EC-04-08 monthly statement: columns, employee code, no-shows billed, cancelled not billed', async () => {
    const user = await createUser({ name: 'Statement Person' });
    await prisma.user.update({ where: { id: user.id }, data: { employeeCode: 'EMP-5555', department: 'Ops' } });
    const dish = await seedDailyItem({ date: '2030-07-02', quantity: 10, pricePaise: 10000 });
    const d2 = await seedDailyItem({ date: '2030-07-03', quantity: 10, pricePaise: 10000 });
    const d3 = await seedDailyItem({ date: '2030-07-04', quantity: 10, pricePaise: 10000 });
    await insertOrder({ userId: user.id, date: '2030-07-02', status: 'COLLECTED', items: [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1, name: dish.name, pricePaise: 10000 }] });
    await insertOrder({ userId: user.id, date: '2030-07-03', status: 'NO_SHOW', items: [{ dailyMenuItemId: d2.dailyMenuItemId, qty: 1, name: d2.name, pricePaise: 10000 }] });
    await insertOrder({ userId: user.id, date: '2030-07-04', status: 'CANCELLED', items: [{ dailyMenuItemId: d3.dailyMenuItemId, qty: 1, name: d3.name, pricePaise: 10000 }] });
    const { agent } = await agentFor('MANAGER');
    const res = await agent.get('/api/reports/statement.csv?month=2030-07');
    expect(res.status).toBe(200);
    const [header, ...rows] = res.text.trim().split(/\r?\n/);
    expect(header).toBe('employee,employee_code,department,email,orders,total_inr');
    const row = rows.find((r) => r.includes('EMP-5555'));
    expect(row).toBeDefined();
    expect(row).toMatch(/,2,200(\.00)?$/);
    expect((await agent.get('/api/reports/statement.csv?month=2030-13')).status).toBe(400);
  });

  it('EC-04-09 employees and staff cannot export', async () => {
    for (const role of ['EMPLOYEE', 'STAFF'] as const) {
      const { agent } = await agentFor(role);
      expect((await agent.get('/api/reports/orders.csv?from=2030-06-01&to=2030-06-02')).status, role).toBe(403);
    }
  });
});

/** TC-API-RBAC-01: endpoint × role matrix from 05-architecture.md §3. */
const MATRIX: { method: 'get' | 'post' | 'put' | 'patch' | 'delete'; path: string; body?: object; allowed: string[] }[] = [
  { method: 'get', path: '/api/daily-menu?date=2030-08-06', allowed: ['EMPLOYEE', 'STAFF', 'MANAGER', 'ADMIN'] },
  { method: 'get', path: '/api/slots?date=2030-08-06', allowed: ['EMPLOYEE', 'STAFF', 'MANAGER', 'ADMIN'] },
  { method: 'get', path: '/api/settings', allowed: ['EMPLOYEE', 'STAFF', 'MANAGER', 'ADMIN'] },
  { method: 'post', path: '/api/orders', body: {}, allowed: ['EMPLOYEE'] },
  { method: 'get', path: '/api/orders/me', allowed: ['EMPLOYEE'] },
  { method: 'get', path: '/api/orders?date=2030-08-06', allowed: ['STAFF'] },
  { method: 'post', path: '/api/orders/verify', body: { pickupCode: 'ZZZZZZ' }, allowed: ['STAFF'] },
  { method: 'patch', path: '/api/orders/99999999/status', body: { status: 'PREPARING' }, allowed: ['STAFF'] },
  { method: 'post', path: '/api/orders/99999999/collect', allowed: ['STAFF'] },
  { method: 'get', path: '/api/reports/prep-list?date=2030-08-06', allowed: ['STAFF'] },
  { method: 'get', path: '/api/menu-items', allowed: ['MANAGER'] },
  { method: 'post', path: '/api/menu-items', body: {}, allowed: ['MANAGER'] },
  { method: 'patch', path: '/api/menu-items/99999999', body: {}, allowed: ['MANAGER'] },
  { method: 'put', path: '/api/daily-menu/2099-01-05', body: {}, allowed: ['MANAGER'] },
  { method: 'get', path: '/api/reports/dashboard?date=2030-08-06', allowed: ['MANAGER', 'ADMIN'] },
  { method: 'get', path: '/api/reports/orders.csv?from=2030-08-01&to=2030-08-02', allowed: ['MANAGER', 'ADMIN'] },
  { method: 'get', path: '/api/reports/statement.csv?month=2030-08', allowed: ['MANAGER', 'ADMIN'] },
  { method: 'get', path: '/api/users', allowed: ['ADMIN'] },
  { method: 'patch', path: '/api/users/99999999', body: {}, allowed: ['ADMIN'] },
  { method: 'put', path: '/api/settings', body: {}, allowed: ['ADMIN'] },
  { method: 'post', path: '/api/closed-dates', body: {}, allowed: ['ADMIN'] },
  { method: 'delete', path: '/api/closed-dates/2099-01-01', allowed: ['ADMIN'] },
];
const ROLES = ['EMPLOYEE', 'STAFF', 'MANAGER', 'ADMIN'] as const;

describe.skipIf(!sprintActive(4))('Sprint 04 · RBAC matrix (TC-API-RBAC-01)', () => {
  const cases = MATRIX.flatMap((e) => ROLES.map((role) => [e.method.toUpperCase(), e.path, role, e.allowed.includes(role), e] as const));
  it.each(cases)('%s %s as %s → allowed=%s', async (_m, _p, role, allowed, e) => {
    const { agent } = await agentFor(role);
    const req = agent[e.method](e.path);
    const res = e.body ? await req.send(e.body) : await req;
    if (allowed) expect([401, 403], `${role} ${e.path}`).not.toContain(res.status);
    else expect(res.status, `${role} ${e.path}`).toBe(403);
  });
});
