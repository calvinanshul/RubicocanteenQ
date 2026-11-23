/** Welcome email on sign-up through Ethereal / SMTP (out-of-sprint change, see docs/test-cases/features/01-sign-up.md EC-04-18…20, EC-04-U4…U9). */
import { describe, expect, it } from 'vitest';
import { createMailer } from '@/server/adapters/mailer';
import { parseEnv } from '@/server/env';
import { escapeHtml, welcomeEmail } from '@/server/services/emailService';

const base = { DATABASE_URL: 'postgresql://x', SESSION_SECRET: 'x'.repeat(32) };

describe('mail settings', () => {
  it('EC-04-U4 sends nothing unless MAIL_TRANSPORT says so', () => {
    expect(parseEnv(base).MAIL_TRANSPORT).toBe('none');
  });
  it('EC-04-U5 smtp needs SMTP_HOST', () => {
    expect(() => parseEnv({ ...base, MAIL_TRANSPORT: 'smtp' })).toThrow(/SMTP_HOST/);
    expect(parseEnv({ ...base, MAIL_TRANSPORT: 'smtp', SMTP_HOST: 'mail.example.com' }).SMTP_PORT).toBe(587);
  });
  it('EC-04-U6 Ethereal login is both or neither; empty values count as unset', () => {
    expect(() => parseEnv({ ...base, MAIL_TRANSPORT: 'ethereal', ETHEREAL_USER: 'a@ethereal.email' })).toThrow(/ETHEREAL/);
    const e = parseEnv({ ...base, MAIL_TRANSPORT: 'ethereal', ETHEREAL_USER: '', ETHEREAL_PASS: '' });
    expect(e.ETHEREAL_USER).toBeUndefined();
    expect(e.ETHEREAL_PASS).toBeUndefined();
  });
  it('EC-04-U7 the none transport resolves without sending', async () => {
    const m = createMailer(parseEnv(base));
    await expect(m.send({ to: 'a@rubicotech.com', subject: 's', text: 't', html: 'h' })).resolves.toEqual({});
  });
});

describe('welcome email', () => {
  it('EC-04-U8 is addressed to the new user with a login link', () => {
    const m = welcomeEmail({ name: 'Priya Sharma', email: 'priya@rubicotech.com' }, 'http://localhost:5173/');
    expect(m.to).toBe('priya@rubicotech.com');
    expect(m.subject).toBe('Welcome to CanteenQ');
    expect(m.text).toContain('Hi Priya Sharma,');
    expect(m.text).toContain('http://localhost:5173/login');
    expect(m.html).toContain('href="http://localhost:5173/login"');
  });
  it('EC-04-U9 a name with HTML is escaped in the HTML body', () => {
    const m = welcomeEmail({ name: '<img src=x onerror=alert(1)>', email: 'x@rubicotech.com' }, 'http://localhost');
    expect(m.html).not.toContain('<img');
    expect(m.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(escapeHtml(`a&"'`)).toBe('a&amp;&quot;&#39;');
  });
});
