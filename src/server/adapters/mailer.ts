import nodemailer, { type Transporter } from 'nodemailer';
import { pino, type Logger } from 'pino';
import { env, type Env } from '../env';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface SentMail {
  /** Ethereal only: the web page that shows the captured email. */
  previewUrl?: string;
}

/** Sends one email. Callers decide whether a failure matters (sign-up never waits for it). */
export interface Mailer {
  send(message: MailMessage): Promise<SentMail>;
}

const ETHEREAL_HOST = 'smtp.ethereal.email';

/** MAIL_TRANSPORT=none: nothing leaves the process. */
class NoopMailer implements Mailer {
  constructor(private readonly log: Logger) {}

  send(message: MailMessage): Promise<SentMail> {
    this.log.debug({ to: message.to, subject: message.subject }, 'Email not sent (MAIL_TRANSPORT=none)');
    return Promise.resolve({});
  }
}

/** Ethereal or SMTP through nodemailer. The connection is set up on the first email, not at start-up. */
class NodemailerMailer implements Mailer {
  private transport: Promise<Transporter> | undefined;

  constructor(
    private readonly connect: () => Promise<Transporter>,
    private readonly from: string,
    private readonly isEthereal: boolean,
    private readonly log: Logger,
  ) {}

  async send(message: MailMessage): Promise<SentMail> {
    this.transport ??= this.connect().catch((err: unknown) => {
      this.transport = undefined; // try again on the next email
      throw err;
    });
    const info = (await (await this.transport).sendMail({ from: this.from, ...message })) as { messageId?: string };
    const url = this.isEthereal ? nodemailer.getTestMessageUrl(info as Parameters<typeof nodemailer.getTestMessageUrl>[0]) : false;
    const previewUrl = url || undefined;
    this.log.info({ to: message.to, subject: message.subject, messageId: info.messageId, previewUrl }, previewUrl ? `Email captured by Ethereal: ${previewUrl}` : 'Email sent');
    return { previewUrl };
  }
}

async function etherealTransport(config: Env, log: Logger): Promise<Transporter> {
  let user = config.ETHEREAL_USER;
  let pass = config.ETHEREAL_PASS;
  if (!user || !pass) {
    const account = await nodemailer.createTestAccount();
    ({ user, pass } = account);
    log.warn(
      { etherealUser: user, etherealPass: pass },
      'Created a throwaway Ethereal account. To keep one inbox across restarts, put these in backend/.env as ETHEREAL_USER and ETHEREAL_PASS. Inbox: https://ethereal.email/login',
    );
  }
  return nodemailer.createTransport({ host: ETHEREAL_HOST, port: 587, secure: false, auth: { user, pass } });
}

function smtpTransport(config: Env): Promise<Transporter> {
  return Promise.resolve(
    nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
    }),
  );
}

export function createMailer(config: Env, log: Logger = pino({ level: config.LOG_LEVEL ?? 'info' })): Mailer {
  switch (config.MAIL_TRANSPORT) {
    case 'ethereal':
      return new NodemailerMailer(() => etherealTransport(config, log), config.MAIL_FROM, true, log);
    case 'smtp':
      return new NodemailerMailer(() => smtpTransport(config), config.MAIL_FROM, false, log);
    case 'none':
      return new NoopMailer(log);
  }
}

let current: Mailer | undefined;

/** The app's mailer, built from the environment on first use. */
export function mailer(): Mailer {
  current ??= createMailer(env());
  return current;
}

/** Tests: swap in a fake mailer (pass undefined to go back to the environment's one). */
export function setMailer(m: Mailer | undefined): void {
  current = m;
}
