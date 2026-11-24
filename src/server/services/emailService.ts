import { ROLE_HOME, ROLE_NAMES, type PublicUser, type Role } from '@/shared';
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

const ROLE_ACCESS: Record<Role, string> = {
  EMPLOYEE: 'order lunch from the daily menu and collect it with your pickup pass',
  STAFF: 'run the counter: the order queue, scanning pickup passes and the prep list',
  MANAGER: 'manage the menu, pickup slots and the dashboard',
  ADMIN: 'manage users, roles and the canteen settings',
};

/** Sent when an admin changes the user's role. */
export function roleChangedEmail(user: { name: string; email: string }, from: Role, to: Role, webOrigin: string): MailMessage {
  const homeUrl = `${webOrigin.replace(/\/+$/, '')}${ROLE_HOME[to]}`;
  const name = escapeHtml(user.name);
  return {
    to: user.email,
    subject: `Your CanteenQ role is now ${ROLE_NAMES[to]}`,
    text: [
      `Hi ${user.name},`,
      '',
      `An admin changed your CanteenQ role from ${ROLE_NAMES[from]} to ${ROLE_NAMES[to]}.`,
      `You can now ${ROLE_ACCESS[to]}. The change applies from your next page load.`,
      '',
      `Open CanteenQ: ${homeUrl}`,
      '',
      "If you didn't expect this change, contact your CanteenQ admin.",
    ].join('\n'),
    html: `<p>Hi ${name},</p>
<p>An admin changed your CanteenQ role from <strong>${ROLE_NAMES[from]}</strong> to <strong>${ROLE_NAMES[to]}</strong>.</p>
<p>You can now ${ROLE_ACCESS[to]}. The change applies from your next page load.</p>
<p><a href="${escapeHtml(homeUrl)}">Open CanteenQ</a></p>
<p style="color:#6b6b6b">If you didn't expect this change, contact your CanteenQ admin.</p>`,
  };
}

/** Never throws: an email problem must not fail or undo the role change. */
export async function sendRoleChangedEmail(
  user: { name: string; email: string },
  from: Role,
  to: Role,
  webOrigin: string,
  log?: Logger,
): Promise<void> {
  try {
    await mailer().send(roleChangedEmail(user, from, to, webOrigin));
  } catch (err) {
    log?.warn({ err, to: user.email }, 'Role-change email failed; the role change is unaffected');
  }
}
