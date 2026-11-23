/** Welcome email on sign-up (out-of-sprint change, see docs/test-cases/features/01-sign-up.md EC-04-18…20, EC-04-U4…U9). */
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setMailer, type MailMessage } from '@/server/adapters/mailer';
import { app, prisma, uniqueEmail } from './helpers';

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
