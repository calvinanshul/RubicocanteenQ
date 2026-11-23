/**
 * Fixed-window, in-memory rate limiter (replaces express-rate-limit).
 * Counts are per server instance: fine for the single Node server this app deploys as; a multi-instance
 * or serverless deploy needs a shared store (e.g. Redis) for the limits to be global.
 */
export interface RateLimit {
  name: string;
  windowMs: number;
  limit: number;
}

export const API_LIMIT: RateLimit = { name: 'api', windowMs: 60_000, limit: 300 };
export const AUTH_LIMIT: RateLimit = { name: 'auth', windowMs: 15 * 60_000, limit: 50 };

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(nowMs: number): void {
  if (nowMs - lastSweep < 60_000) return;
  lastSweep = nowMs;
  for (const [key, b] of buckets) if (b.resetAt <= nowMs) buckets.delete(key);
}

export interface RateResult {
  ok: boolean;
  headers: Record<string, string>;
}

/** Records one hit for `key` and says whether it is within the limit. */
export function hit(rule: RateLimit, key: string, nowMs: number = Date.now()): RateResult {
  sweep(nowMs);
  const id = `${rule.name}:${key}`;
  let bucket = buckets.get(id);
  if (!bucket || bucket.resetAt <= nowMs) {
    bucket = { count: 0, resetAt: nowMs + rule.windowMs };
    buckets.set(id, bucket);
  }
  bucket.count += 1;
  return {
    ok: bucket.count <= rule.limit,
    headers: {
      'RateLimit-Policy': `${rule.limit};w=${rule.windowMs / 1000}`,
      'RateLimit-Limit': String(rule.limit),
      'RateLimit-Remaining': String(Math.max(0, rule.limit - bucket.count)),
      'RateLimit-Reset': String(Math.ceil((bucket.resetAt - nowMs) / 1000)),
    },
  };
}

/**
 * Client IP. Behind one proxy hop (Vercel / a CDN), the right-most X-Forwarded-For entry is the address the
 * proxy saw — the same choice as Express's `trust proxy = 1`.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return req.headers.get('x-real-ip') ?? 'local';
}
