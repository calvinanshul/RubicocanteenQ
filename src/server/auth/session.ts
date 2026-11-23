import { SignJWT, errors as joseErrors, jwtVerify } from 'jose';
import { env } from '../env';
import { serializeCookie } from '../http/cookies';

export const SESSION_COOKIE = 'cq_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

function key(): Uint8Array {
  return new TextEncoder().encode(env().SESSION_SECRET);
}

export async function signSession(userId: number, issuedAt: Date = new Date()): Promise<string> {
  const iat = Math.floor(issuedAt.getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt(iat)
    .setExpirationTime(iat + SESSION_TTL_SECONDS)
    .sign(key());
}

export type SessionResult = { ok: true; userId: number } | { ok: false; reason: 'expired' | 'invalid' };

export async function verifySession(token: string): Promise<SessionResult> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) return { ok: false, reason: 'invalid' };
    return { ok: true, userId };
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) return { ok: false, reason: 'expired' };
    return { ok: false, reason: 'invalid' };
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env().APP_ENV === 'production' || env().APP_ENV === 'staging',
    path: '/',
  };
}

/** Set-Cookie value that stores the session (8 h). */
export function sessionCookie(token: string): string {
  return serializeCookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_TTL_SECONDS });
}

/** Set-Cookie value that removes the session cookie. */
export function clearedSessionCookie(): string {
  return serializeCookie(SESSION_COOKIE, '', { ...cookieOptions(), expires: new Date(0) });
}
