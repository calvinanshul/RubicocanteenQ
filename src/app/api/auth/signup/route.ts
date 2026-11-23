import { signupBaseSchema } from '@/shared';
import { sessionCookie, signSession } from '@/server/auth/session';
import { route } from '@/server/http/route';
import { signup } from '@/server/services/authService';
import { sendWelcomeEmail } from '@/server/services/emailService';

/** A1 */
export const POST = route({ public: true, authLimiter: true, body: signupBaseSchema }, async ({ body, config, log }) => {
  const user = await signup(body);
  // Sessions always run on real time (see the login route)
  const token = await signSession(user.id);
  // Fire and forget: the welcome email never delays or fails the sign-up
  void sendWelcomeEmail(user, config.WEB_ORIGIN, log);
  return Response.json(user, { status: 201, headers: { 'Set-Cookie': sessionCookie(token) } });
});
