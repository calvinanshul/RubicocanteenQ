import { loginSchema } from '@/shared';
import { now } from '@/server/adapters/clock';
import { sessionCookie, signSession } from '@/server/auth/session';
import { route } from '@/server/http/route';
import { login } from '@/server/services/authService';

/** A2 */
export const POST = route({ public: true, authLimiter: true, body: loginSchema }, async ({ body, testNow }) => {
  const user = await login(body.email, body.password, now({ testNow }));
  // Sessions always run on real time: the test clock is for business rules, and the token is checked on real time
  const token = await signSession(user.id);
  return Response.json({ user }, { headers: { 'Set-Cookie': sessionCookie(token) } });
});
