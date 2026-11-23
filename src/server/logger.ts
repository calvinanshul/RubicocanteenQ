import { pino, type Logger } from 'pino';
import { env } from './env';

let current: Logger | undefined;

/** The app's logger. Silent under APP_ENV=test unless LOG_LEVEL says otherwise. */
export function logger(): Logger {
  if (!current) {
    const config = env();
    current = pino({
      level: config.LOG_LEVEL ?? (config.APP_ENV === 'test' ? 'silent' : 'info'),
      redact: ['req.headers.cookie', 'req.headers.authorization', '*.password'],
    });
  }
  return current;
}
