import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { addDays, dbDate, todayIST } from '@/server/adapters/clock';
import { createApp } from './nextApp';
import { parseEnv } from '@/server/env';
import { TEST_ENV } from '../testDb';
import { app, createUser, dishId, expectErrorShape, ist, prisma, TEST_PASSWORD } from './helpers';

describe('health (TC-API-SYS-01)', () => {
  it('reports ok with the DB status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'ok' });
    expect(typeof res.body.time).toBe('string');
  });
});

describe('test clock disabled (TC-API-SYS-02)', () => {
  it('ignores x-test-now when ENABLE_TEST_CLOCK is off', async () => {
    // A menu for yesterday: with the clock honoured at 09:00 yesterday, ordering is open; real time says closed.
    const yesterday = addDays(todayIST(), -1);
    const menuItemId = await dishId('Curd Rice');
    await prisma.dailyMenuItem.upsert({
      where: { menuDate_menuItemId: { menuDate: dbDate(yesterday), menuItemId } },
      update: {},
      create: { menuDate: dbDate(yesterday), menuItemId, quantity: 10 },
    });
    await prisma.settings.update({ where: { id: 1 }, data: { closedWeekdays: [] } });
    try {
      const user = await createUser();
      const header = ist(`${yesterday}T09:00:00`);

      const withClock = request.agent(app);
      await withClock.post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD }).expect(200);
      const on = await withClock.get(`/api/daily-menu?date=${yesterday}`).set('x-test-now', header);
      expect(on.body.orderingOpen).toBe(true);

      const prodLike = createApp(parseEnv({ ...TEST_ENV, ENABLE_TEST_CLOCK: 'false' }));
      const noClock = request.agent(prodLike);
      await noClock.post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD }).expect(200);
      const off = await noClock.get(`/api/daily-menu?date=${yesterday}`).set('x-test-now', header);
      expect(off.status).toBe(200);
      expect(off.body.orderingOpen).toBe(false);
    } finally {
      await prisma.settings.update({ where: { id: 1 }, data: { closedWeekdays: [0, 6] } });
    }
  });

  it('refuses to start with the test clock in production', () => {
    expect(() => parseEnv({ ...TEST_ENV, APP_ENV: 'production', ENABLE_TEST_CLOCK: 'true' })).toThrow();
  });
});

describe('error format (TC-API-VAL-01, TC-API-VAL-02)', () => {
  it('returns 400 INVALID_JSON with no stack trace for malformed JSON', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"date":');
    expect(res.status).toBe(400);
    expectErrorShape(res.body, 'INVALID_JSON');
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.(ts|js):\d+/);
  });

  it('uses the same {error:{code,message,fields}} shape for 400s on different endpoints', async () => {
    const manager = await createUser({ role: 'MANAGER' });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: manager.email, password: TEST_PASSWORD }).expect(200);
    const responses = [
      await request(app).post('/api/auth/signup').send({ name: '', email: 'bad', password: 'x' }),
      await request(app).post('/api/auth/login').send({}),
      await agent.post('/api/menu-items').send({ name: '', pricePaise: 0 }),
      await agent.put('/api/daily-menu/2099-01-05').send({ entries: [] }),
      await agent.get('/api/daily-menu?date=not-a-date'),
    ];
    for (const res of responses) {
      expect(res.status).toBe(400);
      expectErrorShape(res.body, 'VALIDATION_ERROR');
      expect(typeof res.body.error.fields).toBe('object');
    }
  });

  it('returns 404 NOT_FOUND for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expectErrorShape(res.body, 'NOT_FOUND');
  });
});

// Regression for BUG-03-001: the UI takes "today" from the server, never from the device
describe('server clock (X3)', () => {
  it('returns the server time and IST date, honouring the test clock', async () => {
    const res = await request(app).get('/api/time').set('x-test-now', '2030-03-05T23:59:00+05:30');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ serverTime: '2030-03-05T18:29:00.000Z', today: '2030-03-05' });
    expect(res.headers['cache-control']).toBe('no-store');
    const next = await request(app).get('/api/time').set('x-test-now', '2030-03-06T00:00:00+05:30');
    expect(next.body.today).toBe('2030-03-06');
  });
});
