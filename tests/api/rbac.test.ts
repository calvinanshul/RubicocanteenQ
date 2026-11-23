import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { agentFor, app, createUser, expectErrorShape, prisma, TEST_PASSWORD } from './helpers';

const PROTECTED: [method: 'get' | 'post' | 'put', path: string][] = [
  ['get', '/api/auth/me'],
  ['get', '/api/settings'],
  ['get', '/api/menu-items'],
  ['post', '/api/menu-items'],
  ['get', '/api/daily-menu?date=2026-11-17'],
  ['put', '/api/daily-menu/2026-11-18'],
];

describe('access control', () => {
  it.each(PROTECTED)('TC-API-RBAC-02 %s %s without a cookie → 401', async (method, path) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(401);
    expectErrorShape(res.body, 'UNAUTHENTICATED');
  });

  it('TC-API-RBAC-05 an EMPLOYEE cannot create menu items (manager can)', async () => {
    const { agent } = await agentFor('EMPLOYEE');
    const body = { name: `Rbac Dish ${Date.now()}`, category: 'MAIN', pricePaise: 9000, diet: 'VEG' };
    const res = await agent.post('/api/menu-items').send(body);
    expect(res.status).toBe(403);
    expectErrorShape(res.body, 'FORBIDDEN');

    const { agent: manager } = await agentFor('MANAGER');
    const ok = await manager.post('/api/menu-items').send(body);
    expect(ok.status).toBe(201);
  });

  it.each(['EMPLOYEE', 'STAFF', 'ADMIN'] as const)('%s cannot publish a daily menu', async (role) => {
    const { agent } = await agentFor(role);
    const res = await agent.put('/api/daily-menu/2099-03-02').send({ entries: [{ menuItemId: 1, quantity: 5 }] });
    expect(res.status).toBe(403);
  });

  it('TC-API-RBAC-06 a demotion applies to the existing session immediately', async () => {
    const manager = await createUser({ role: 'MANAGER' });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: manager.email, password: TEST_PASSWORD }).expect(200);
    await agent.get('/api/menu-items').expect(200);
    await prisma.user.update({ where: { id: manager.id }, data: { role: 'EMPLOYEE' } });
    const res = await agent.post('/api/menu-items').send({ name: 'After Demotion', category: 'MAIN', pricePaise: 9000, diet: 'VEG' });
    expect(res.status).toBe(403);
    const me = await agent.get('/api/auth/me');
    expect(me.body.role).toBe('EMPLOYEE');
  });

  it('BR12 a deactivated user\'s existing session is rejected', async () => {
    const user = await createUser();
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD }).expect(200);
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('settings hide allowedDomains from non-admins', async () => {
    const { agent: emp } = await agentFor('EMPLOYEE');
    const e = await emp.get('/api/settings');
    expect(e.status).toBe(200);
    expect(e.body.pickupLocation).toBe('Building 4 · Counter A');
    expect(e.body.allowedDomains).toBeUndefined();
    const { agent: admin } = await agentFor('ADMIN');
    const a = await admin.get('/api/settings');
    expect(a.body.allowedDomains).toEqual(['rubicotech.com', 'rubicotech.in']);
  });
});
