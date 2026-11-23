import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { createQueryClient } from '../providers';
import { memoryRouter } from './nextMock';
import { TestApp } from './nextApp';

export { App } from './nextApp';

/** What GET /api/time would answer if the server clock matched the device. */
export function serverTimeNow(at: Date = new Date()) {
  return { serverTime: at.toISOString(), today: new Date(at.getTime() + 330 * 60_000).toISOString().slice(0, 10) };
}

type Handler = (url: string, init?: RequestInit) => { status: number; body?: unknown } | undefined;

/** Stub fetch with a route handler; returns the mock so tests can assert which calls were made. */
export function mockApi(handler: Handler) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    let res = handler(url, init);
    // Default server clock (X3) = device clock, unless the test answers /time with its own serverTime
    const answersTime = typeof res?.body === 'object' && res.body !== null && 'serverTime' in res.body;
    if (url.endsWith('/api/time') && !answersTime) res = { status: 200, body: serverTimeNow() };
    res ??= { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Not found' } } };
    return new Response(res.status === 204 ? null : JSON.stringify(res.body ?? {}), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

export const loggedOut = { status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'Please log in' } } };

export function userOf(role: 'EMPLOYEE' | 'STAFF' | 'MANAGER' | 'ADMIN') {
  return { id: 1, name: 'Priya Sharma', email: 'priya@rubicotech.com', role, employeeCode: 'EMP-8921', department: 'Tech Eng' };
}

export function renderRoute(path: string) {
  memoryRouter.reset(path);
  const client = createQueryClient();
  const utils = render(<TestApp client={client} />);
  return { ...utils, router: memoryRouter, client };
}

export function calls(fn: ReturnType<typeof mockApi>, path: string, method = 'GET') {
  return fn.mock.calls.filter(([url, init]) => String(url).includes(path) && (init?.method ?? 'GET') === method);
}
