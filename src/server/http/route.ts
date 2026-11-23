import type { Logger } from 'pino';
import type { z, ZodTypeAny } from 'zod';
import { zodFieldErrors, type Role } from '@/shared';
import { SESSION_COOKIE, verifySession } from '../auth/session';
import { prisma } from '../db';
import { env, type Env } from '../env';
import { AppError, errorResponse, toErrorResponse } from '../errors';
import { logger } from '../logger';
import type { AuthUser } from '../types';
import { parseCookies } from './cookies';
import { API_LIMIT, AUTH_LIMIT, clientIp, hit } from './rateLimit';

/** Largest accepted JSON body (same as the old express.json limit). */
const BODY_LIMIT_BYTES = 100 * 1024;

type Infer<S> = S extends ZodTypeAny ? z.infer<S> : undefined;

export interface RouteSpec<P, Q, B, Pub extends boolean> {
  /** No session needed. Default: a logged-in, active user is required (401 otherwise). */
  public?: Pub;
  /** 403 unless the user has one of these roles. */
  roles?: Role[];
  /** Also apply the strict login / sign-up limiter (50 per 15 min per IP). */
  authLimiter?: boolean;
  params?: P;
  query?: Q;
  body?: B;
}

export interface RouteContext<P, Q, B, Pub extends boolean> {
  req: Request;
  user: Pub extends true ? undefined : AuthUser;
  params: Infer<P>;
  query: Infer<Q>;
  body: Infer<B>;
  /** "Now" for business rules: honours the `x-test-now` header when ENABLE_TEST_CLOCK=true. */
  testNow?: Date;
  log: Logger;
  config: Env;
}

/** What Next.js passes as the second argument to a route handler. */
export interface NextRouteArgs {
  params: Promise<Record<string, string | string[] | undefined>>;
}

export type RouteHandler = (req: Request, args: NextRouteArgs) => Promise<Response>;

/** A route handler result: a Response as is, or any other value as 200 JSON. */
type Result = Response | object | null | undefined;

function validationError(error: z.ZodError): AppError {
  return new AppError('VALIDATION_ERROR', 400, 'Please fix the highlighted fields', zodFieldErrors(error));
}

function parseWith<S extends ZodTypeAny>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) throw validationError(result.error);
  return result.data;
}

/** Parse a value with a schema or throw a 400 VALIDATION_ERROR (for checks that need data first). */
export const parseOrThrow = parseWith;

/** Query string as an object; a repeated key becomes an array (as in Express), so `?date=a&date=b` fails validation. */
function queryObject(params: URLSearchParams): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key);
    out[key] = all.length > 1 ? all : (all[0] ?? '');
  }
  return out;
}

const BODYLESS = new Set(['GET', 'HEAD', 'DELETE', 'OPTIONS']);

/** Reads the JSON body like express.json(): only for JSON content types; {} when empty or not JSON. */
async function readJsonBody(req: Request): Promise<unknown> {
  if (BODYLESS.has(req.method)) return {};
  const type = req.headers.get('content-type') ?? '';
  if (!/^application\/([\w.+-]*\+)?json\b/i.test(type)) return {};
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > BODY_LIMIT_BYTES) throw new AppError('VALIDATION_ERROR', 413, 'Request body is too large');
  const text = await req.text();
  if (new TextEncoder().encode(text).length > BODY_LIMIT_BYTES) {
    throw new AppError('VALIDATION_ERROR', 413, 'Request body is too large');
  }
  if (text.trim() === '') return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AppError('INVALID_JSON', 400, 'Request body is not valid JSON');
  }
  // express.json is strict: only objects and arrays
  if (typeof parsed !== 'object' || parsed === null) throw new AppError('INVALID_JSON', 400, 'Request body is not valid JSON');
  return parsed;
}

/**
 * Loads the user from the session cookie on every request, so role changes and deactivation apply
 * immediately (US-03 AC6, BR12).
 */
export async function authenticate(req: Request): Promise<AuthUser> {
  const token = parseCookies(req.headers.get('cookie'))[SESSION_COOKIE];
  if (!token) throw new AppError('UNAUTHENTICATED', 401, 'Please log in');
  const session = await verifySession(token);
  if (!session.ok) {
    throw session.reason === 'expired'
      ? new AppError('SESSION_EXPIRED', 401, 'Your session expired. Please log in again.')
      : new AppError('UNAUTHENTICATED', 401, 'Please log in');
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, employeeCode: true, department: true, isActive: true },
  });
  if (!user || !user.isActive) throw new AppError('UNAUTHENTICATED', 401, 'Please log in');
  const { isActive: _active, ...authUser } = user;
  return authUser;
}

/** `x-test-now` header value, only when the test clock is enabled (TC-API-SYS-02). */
function testNowOf(req: Request, config: Env): Date | undefined {
  if (!config.ENABLE_TEST_CLOCK) return undefined;
  const header = req.headers.get('x-test-now');
  if (!header) return undefined;
  const parsed = new Date(header);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function withHeaders(res: Response, headers: Record<string, string>): Response {
  for (const [k, v] of Object.entries(headers)) {
    try {
      res.headers.set(k, v);
    } catch {
      // immutable headers (e.g. a Response.redirect): leave as is
    }
  }
  return res;
}

/**
 * Applies the API-wide rules (rate limits, body parsing, session, role, validation) and turns errors into
 * the standard error JSON. Replaces the Express middleware chain; the order matches the old one.
 */
export function route<
  P extends ZodTypeAny | undefined = undefined,
  Q extends ZodTypeAny | undefined = undefined,
  B extends ZodTypeAny | undefined = undefined,
  Pub extends boolean = false,
>(spec: RouteSpec<P, Q, B, Pub>, handler: (ctx: RouteContext<P, Q, B, Pub>) => Promise<Result> | Result): RouteHandler {
  return async (req, args) => {
    const started = Date.now();
    const config = env();
    const isTest = config.APP_ENV === 'test';
    const log = logger();
    let rateHeaders: Record<string, string> = {};
    let userId: number | undefined;
    let res: Response;
    try {
      if (!isTest) {
        const ip = clientIp(req);
        const api = hit(API_LIMIT, ip);
        rateHeaders = api.headers;
        if (!api.ok) throw new AppError('TOO_MANY_ATTEMPTS', 429, 'Too many requests. Please try again later.');
        if (spec.authLimiter && !hit(AUTH_LIMIT, ip).ok) {
          throw new AppError('TOO_MANY_ATTEMPTS', 429, 'Too many attempts. Try again in 15 minutes.');
        }
      }
      const rawBody = await readJsonBody(req);
      const testNow = testNowOf(req, config);

      let user: AuthUser | undefined;
      if (!spec.public) {
        user = await authenticate(req);
        userId = user.id;
        if (spec.roles && !spec.roles.includes(user.role)) throw new AppError('FORBIDDEN', 403, "You don't have access to this");
      }

      const rawParams = await args.params;
      const params = spec.params ? parseWith(spec.params, rawParams) : undefined;
      const query = spec.query ? parseWith(spec.query, queryObject(new URL(req.url).searchParams)) : undefined;
      const body = spec.body ? parseWith(spec.body, rawBody) : rawBody;

      const result = await handler({
        req,
        user: user as RouteContext<P, Q, B, Pub>['user'],
        params: params as Infer<P>,
        query: query as Infer<Q>,
        body: body as Infer<B>,
        testNow,
        log,
        config,
      });
      res = result instanceof Response ? result : Response.json(result ?? null);
    } catch (err) {
      res = toErrorResponse(err, (e) => log.error({ err: e, method: req.method, url: req.url }, 'Unhandled error'));
    }
    log.info({ method: req.method, url: new URL(req.url).pathname, status: res.status, ms: Date.now() - started, userId }, 'request');
    return withHeaders(res, rateHeaders);
  };
}

/** 201 / 200 JSON with optional extra headers. */
export function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, init);
}

export function noContent(headers?: HeadersInit): Response {
  return new Response(null, { status: 204, headers });
}

/** Unknown /api paths. */
export function notFound(): Response {
  return errorResponse(404, 'NOT_FOUND', 'Not found');
}
