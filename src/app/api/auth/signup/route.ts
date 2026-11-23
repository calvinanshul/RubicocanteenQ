import { signupBaseSchema } from '@/shared';
import { now } from '@/server/adapters/clock';
import { sessionCookie, signSession } from '@/server/auth/session';
import { route } from '@/server/http/route';
import { signup } from '@/server/services/authService';
import { sendWelcomeEmail } from '@/server/services/emailService';

/** A1 */
export const POST = route({ public: true, authLimiter: true, body: signupBaseSchema }, async ({ body, testNow, config, log }) => {
  const user = await signup(body);
  const token = await signSession(user.id, now({ testNow }));
  // Fire and forget: the welcome email never delays or fails the sign-up
  void sendWelcomeEmail(user, config.WEB_ORIGIN, log);
  return Response.json(user, { status: 201, headers: { 'Set-Cookie': sessionCookie(token) } });
});
