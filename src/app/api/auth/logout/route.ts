import { clearedSessionCookie } from '@/server/auth/session';
import { noContent, route } from '@/server/http/route';

/** A3: always clears the cookie. */
export const POST = route({ public: true }, () => noContent({ 'Set-Cookie': clearedSessionCookie() }));
