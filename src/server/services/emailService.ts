import type { PublicUser } from '@/shared';
import type { Logger } from 'pino';
import { mailer, type MailMessage } from '../adapters/mailer';

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** User-typed text (a name) must never become markup in the email. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

/** Sent once, right after a successful sign-up. */
export function welcomeEmail(user: Pick<PublicUser, 'name' | 'email'>, webOrigin: string): MailMessage {
  const loginUrl = `${webOrigin.replace(/\/+$/, '')}/login`;
  const name = escapeHtml(user.name);
  return {
    to: user.email,
    subject: 'Welcome to CanteenQ',
    text: [
      `Hi ${user.name},`,
      '',
      'Your CanteenQ account is ready. Pick your lunch from the daily menu, choose a pickup slot, and show your pass at the counter.',
      '',
      `Log in: ${loginUrl}`,
      '',
      "If you didn't sign up, you can ignore this email.",
    ].join('\n'),
    html: `<p>Hi ${name},</p>
<p>Your CanteenQ account is ready. Pick your lunch from the daily menu, choose a pickup slot, and show your pass at the counter.</p>
<p><a href="${escapeHtml(loginUrl)}">Log in to CanteenQ</a></p>
<p style="color:#6b6b6b">If you didn't sign up, you can ignore this email.</p>`,
  };
}

/** Never throws and is not awaited by the request: an email problem must not fail or slow down sign-up. */
export async function sendWelcomeEmail(user: Pick<PublicUser, 'name' | 'email'>, webOrigin: string, log?: Logger): Promise<void> {
  try {
    await mailer().send(welcomeEmail(user, webOrigin));
  } catch (err) {
    log?.warn({ err, to: user.email }, 'Welcome email failed; sign-up is unaffected');
  }
}
