import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { signSession, SESSION_COOKIE } from '@/server/auth/session';
import { app, createUser, expectErrorShape, prisma, TEST_PASSWORD, uniqueEmail } from './helpers';

describe('sign up', () => {
  it('TC-API-AUTH-01 creates an EMPLOYEE with a secure cookie and no hash in the body', async () => {
    const email = uniqueEmail('priya');
    const res = await request(app).post('/api/auth/signup').send({ name: 'Priya Sharma', email, password: 'Lunch2026' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Priya Sharma', email, role: 'EMPLOYEE' });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2b\$/);
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/cq_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(stored.passwordHash.startsWith('$2b$12$')).toBe(true);
  });

  it('logs the new user in (cookie works for /me)', async () => {
    const agent = request.agent(app);
    const email = uniqueEmail();
    await agent.post('/api/auth/signup').send({ name: 'New Person', email, password: 'Lunch2026' }).expect(201);
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
  });

  it('TC-API-AUTH-02 rejects a non-company domain with 403 and creates no user', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'X Person', email: 'x@gmail.com', password: 'Lunch2026' });
    expect(res.status).toBe(403);
    expectErrorShape(res.body, 'DOMAIN_NOT_ALLOWED');
    expect(await prisma.user.count({ where: { email: 'x@gmail.com' } })).toBe(0);
  });

  it('TC-API-AUTH-03 rejects a duplicate email case-insensitively (trimmed)', async () => {
    const email = uniqueEmail('dup');
    await request(app).post('/api/auth/signup').send({ name: 'Dup One', email, password: 'Lunch2026' }).expect(201);
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Dup Two', email: `  ${email.toUpperCase()} `, password: 'Lunch2026' });
    expect(res.status).toBe(409);
    expectErrorShape(res.body, 'EMAIL_EXISTS');
  });

  it('accepts the second company domain (@rubicotech.in)', async () => {
    const email = uniqueEmail('in').replace('@rubicotech.com', '@rubicotech.in');
    const res = await request(app).post('/api/auth/signup').send({ name: 'India Office', email, password: 'Lunch2026' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe(email);
  });

  it('the domain error names both company domains', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'X Person', email: 'x@company.co', password: 'Lunch2026' });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('Use your company email (@rubicotech.com or @rubicotech.in)');
  });

  it('TC-API-AUTH-08 rejects a weak password with fields.password', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'Weak Pass', email: uniqueEmail(), password: 'abc' });
    expect(res.status).toBe(400);
    expectErrorShape(res.body, 'VALIDATION_ERROR');
    expect(res.body.error.fields.password).toMatch(/8–64 characters/);
  });

  it('exposes the allowed domains publicly for the sign-up form', async () => {
    const res = await request(app).get('/api/auth/signup-config');
    expect(res.status).toBe(200);
    expect(res.body.allowedDomains).toEqual(['rubicotech.com', 'rubicotech.in']);
  });
});

describe('log in / log out', () => {
  it('logs in with valid credentials and returns the role', async () => {
    const user = await createUser({ role: 'STAFF' });
    const res = await request(app).post('/api/auth/login').send({ email: user.email.toUpperCase(), password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, role: 'STAFF' });
    expect(String(res.headers['set-cookie'])).toMatch(/HttpOnly/i);
  });

  it('TC-API-AUTH-04 gives an identical 401 for a wrong password and an unknown email', async () => {
    const user = await createUser();
    const wrong = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Wrong2026' });
    const unknown = await request(app).post('/api/auth/login').send({ email: uniqueEmail('ghost'), password: 'Wrong2026' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expectErrorShape(wrong.body, 'INVALID_CREDENTIALS');
  });

  it('TC-API-AUTH-05 locks after 5 failures, even for the correct password', async () => {
    const user = await createUser();
    for (let i = 0; i < 5; i++) {
      const r = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Wrong2026' });
      expect(r.status).toBe(401);
    }
    const sixth = await request(app).post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD });
    expect(sixth.status).toBe(429);
    expectErrorShape(sixth.body, 'TOO_MANY_ATTEMPTS');
  });

  it('TC-API-AUTH-06 rejects a disabled account with 403', async () => {
    const user = await createUser({ isActive: false });
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD });
    expect(res.status).toBe(403);
    expectErrorShape(res.body, 'ACCOUNT_DISABLED');
  });

  it('TC-API-AUTH-07 logout clears the session', async () => {
    const user = await createUser();
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD }).expect(200);
    await agent.get('/api/auth/me').expect(200);
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(204);
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });

  it('TC-API-AUTH-09 returns SESSION_EXPIRED for an expired token', async () => {
    const user = await createUser();
    const token = await signSession(user.id, new Date(Date.now() - 9 * 60 * 60 * 1000));
    const res = await request(app).get('/api/auth/me').set('Cookie', `${SESSION_COOKIE}=${token}`);
    expect(res.status).toBe(401);
    expectErrorShape(res.body, 'SESSION_EXPIRED');
  });

  it('rejects a tampered token as UNAUTHENTICATED', async () => {
    const user = await createUser();
    const token = await signSession(user.id);
    const res = await request(app).get('/api/auth/me').set('Cookie', `${SESSION_COOKIE}=${token}x`);
    expect(res.status).toBe(401);
    expectErrorShape(res.body, 'UNAUTHENTICATED');
  });

  it('/me returns the profile fields', async () => {
    const agentUser = await createUser({ role: 'EMPLOYEE' });
    await prisma.user.update({ where: { id: agentUser.id }, data: { employeeCode: 'EMP-1234', department: 'QA' } });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: agentUser.email, password: TEST_PASSWORD }).expect(200);
    const me = await agent.get('/api/auth/me');
    expect(me.body).toEqual({
      id: agentUser.id,
      name: 'Test User',
      email: agentUser.email,
      role: 'EMPLOYEE',
      employeeCode: 'EMP-1234',
      department: 'QA',
    });
  });
});
