import { timingSafeEqual } from 'node:crypto';
import { now } from '@/server/adapters/clock';
import { AppError } from '@/server/errors';
import { route } from '@/server/http/route';
import { markNoShows } from '@/server/services/noShowService';

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * X2: scheduled job (GitHub Actions). `Authorization: Bearer $CRON_SECRET`; with no secret configured every
 * call is refused. Honours the test clock where enabled.
 */
export const POST = route({ public: true }, async ({ req, config, testNow }) => {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const secret = config.CRON_SECRET;
  if (!secret || !token || !sameSecret(token, secret)) throw new AppError('UNAUTHENTICATED', 401, 'Invalid cron token');
  return { updated: await markNoShows(now({ testNow })) };
});
