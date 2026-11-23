import type { ApiErrorBody, ErrorCode } from '@/shared';

const BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';
const SLOW_MS = 3000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode | 'NETWORK_ERROR',
    message: string,
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/* ---- "Waking up the server…" tracking (free API host sleeps when idle, NFR7) ---- */
type Listener = () => void;
let slowCount = 0;
const listeners = new Set<Listener>();
function setSlow(delta: number) {
  slowCount = Math.max(0, slowCount + delta);
  listeners.forEach((l) => l());
}
export const slowRequests = {
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot: () => slowCount > 0,
};

/* ---- Unauthorised handling ---- */
let onUnauthorized: (code: string) => void = () => undefined;
/** Registered by the app so a 401 from any data request sends the user to the login page. */
export function setUnauthorizedHandler(handler: (code: string) => void): void {
  onUnauthorized = handler;
}

/** Endpoints where a 401 is an expected answer, not a reason to redirect. */
const NO_REDIRECT = ['/auth/me', '/auth/login', '/auth/signup', '/auth/logout'];

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function isErrorBody(v: unknown): v is ApiErrorBody {
  return typeof v === 'object' && v !== null && 'error' in v && typeof (v as ApiErrorBody).error?.code === 'string';
}

/** Typed fetch wrapper on the same-origin /api base. Throws ApiError for non-2xx responses. */
export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let slowMarked = false;
  const timer = setTimeout(() => {
    slowMarked = true;
    setSlow(1);
  }, SLOW_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? 'GET',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...opts.headers,
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', "Can't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
    if (slowMarked) setSlow(-1);
  }

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => undefined);
  if (!res.ok) {
    const err = isErrorBody(data)
      ? new ApiError(res.status, data.error.code, data.error.message, data.error.fields)
      : new ApiError(res.status, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
    if (res.status === 401 && !NO_REDIRECT.some((p) => path.startsWith(p))) onUnauthorized(err.code);
    throw err;
  }
  return data as T;
}

/**
 * Download a file from the API (CSV exports, S16). Fetches with the session cookie, then saves it
 * under the server's Content-Disposition filename. Throws ApiError like `api()`.
 */
export async function downloadFile(path: string, fallbackName: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { credentials: 'same-origin', headers: { Accept: 'text/csv, application/json' } });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', "Can't reach the server. Check your connection and try again.");
  }
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => undefined);
    const err = isErrorBody(data)
      ? new ApiError(res.status, data.error.code, data.error.message, data.error.fields)
      : new ApiError(res.status, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
    if (res.status === 401) onUnauthorized(err.code);
    throw err;
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}
