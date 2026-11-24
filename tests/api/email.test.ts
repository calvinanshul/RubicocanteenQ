/** Welcome email on sign-up and role-change email (see docs/test-cases/features/01-sign-up.md EC-04-18…20, 14-users-admin.md EC-04-21…23). */
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setMailer, type MailMessage } from '@/server/adapters/mailer';
import { agentFor, app, createUser, prisma, uniqueEmail } from './helpers';

function fakeMailer(fail = false) {
  const sent: MailMessage[] = [];
  const mailer = {
    send: vi.fn((m: MailMessage) => {
      sent.push(m);
      return fail ? Promise.reject(new Error('SMTP down')) : Promise.resolve({});
    }),
  };
  setMailer(mailer);
  return { sent, mailer };
}

afterEach(() => setMailer(undefined));

describe('welcome email on sign-up', () => {
  it('EC-04-18 a successful sign-up sends one welcome email to the new address', async () => {
    const { sent } = fakeMailer();
    const email = uniqueEmail('welcome');
    await request(app).post('/api/auth/signup').send({ name: 'Wel Come', email, password: 'Lunch2026' }).expect(201);
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ to: email, subject: 'Welcome to CanteenQ' });
    expect(sent[0]?.text).toContain('Hi Wel Come,');
  });

  it('EC-04-19 a mail failure never fails the sign-up', async () => {
    const { mailer } = fakeMailer(true);
    const email = uniqueEmail('mailfail');
    const res = await request(app).post('/api/auth/signup').send({ name: 'Mail Fail', email, password: 'Lunch2026' });
    expect(res.status).toBe(201);
    expect(res.headers['set-cookie']).toBeDefined();
    await vi.waitFor(() => expect(mailer.send).toHaveBeenCalledTimes(1));
    expect(await prisma.user.findUnique({ where: { email } })).not.toBeNull();
  });

  it('EC-04-20 a sign-up the API refuses sends nothing', async () => {
    const { mailer } = fakeMailer();
    const email = uniqueEmail('dupmail');
    await request(app).post('/api/auth/signup').send({ name: 'First One', email, password: 'Lunch2026' }).expect(201);
    await vi.waitFor(() => expect(mailer.send).toHaveBeenCalledTimes(1));
    await request(app).post('/api/auth/signup').send({ name: 'Second One', email, password: 'Lunch2026' }).expect(409);
    await request(app).post('/api/auth/signup').send({ name: 'Gmail User', email: 'x@gmail.com', password: 'Lunch2026' }).expect(403);
    await request(app).post('/api/auth/signup').send({ name: 'Bad Body', email: 'nope', password: 'x' }).expect(400);
    // Give any stray fire-and-forget send a chance to run before counting
    await new Promise((r) => setTimeout(r, 50));
    expect(mailer.send).toHaveBeenCalledTimes(1);
  });
});

describe('role-change email', () => {
  it('EC-04-21 an admin changing a role emails the user once, naming the old and new role', async () => {
    const { agent } = await agentFor('ADMIN');
    const target = await createUser({ name: 'Role Mover' });
    const { sent } = fakeMailer();
    const res = await agent.patch(`/api/users/${target.id}`).send({ role: 'STAFF' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('STAFF');
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ to: target.email, subject: 'Your CanteenQ role is now Staff' });
    expect(sent[0]?.text).toContain('from Employee to Staff');
    expect(sent[0]?.text).toContain('/staff/queue');
  });

  it('EC-04-22 no email when the role does not change (same role, other fields, refused change)', async () => {
    const { agent } = await agentFor('ADMIN');
    const target = await createUser();
    const { mailer } = fakeMailer();
    await agent.patch(`/api/users/${target.id}`).send({ role: 'EMPLOYEE' }).expect(200);
    await agent.patch(`/api/users/${target.id}`).send({ department: 'Finance', isActive: false }).expect(200);
    await agent.patch('/api/users/99999999').send({ role: 'STAFF' }).expect(404);
    const { agent: employee } = await agentFor('EMPLOYEE');
    await employee.patch(`/api/users/${target.id}`).send({ role: 'MANAGER' }).expect(403);
    await new Promise((r) => setTimeout(r, 50));
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('EC-04-23 a mail failure never fails or undoes the role change', async () => {
    const { agent } = await agentFor('ADMIN');
    const target = await createUser();
    const { mailer } = fakeMailer(true);
    await agent.patch(`/api/users/${target.id}`).send({ role: 'MANAGER' }).expect(200);
    await vi.waitFor(() => expect(mailer.send).toHaveBeenCalledTimes(1));
    expect((await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).role).toBe('MANAGER');
  });
});
