# ADR-002: Migrate to a single Next.js app

- **Status:** accepted · 2026-11-23
- **Supersedes:** the monorepo layout in [ADR-001](04-adr-001-tech-stack.md) (React + Vite frontend, Express backend, shared package)

## Decision
Move CanteenQ into one Next.js 16 App Router project. The pages become App Router routes, and each Express
router becomes Route Handlers under `src/app/api`. Services, Prisma schema and migrations, and the shared Zod
package move over unchanged.

## What maps to what
| Before | After |
|---|---|
| `frontend/src/App.tsx` route table | `src/app/**` folders; route groups `(public)`, `(employee)`, `(console)` and `staff/` carry the guards and shells in `layout.tsx` |
| `<Outlet />`, `<Navigate>`, `NavLink`, `useSearchParams` setter | `children`, plus `Navigate`, `NavLink` and `useSearchParamsState` in `src/lib/navigation.tsx` over `next/navigation` |
| `frontend/src/routes/*` | `src/screens/*` (client components rendered by `page.tsx`) |
| `backend/src/routes/*.ts` (Express routers) | `src/app/api/**/route.ts` |
| `authenticate`, `requireRole`, `validate`, `asyncHandler`, `errorHandler`, `testClock`, `express.json` | `route()` in `src/server/http/route.ts`. It checks in the same order: rate limit → JSON body → session → role → params → query → body |
| `express-rate-limit` | `src/server/http/rateLimit.ts` (in memory, same limits) |
| `helmet` | security headers in `next.config.ts` |
| `cors`, Vite/Netlify `/api` proxy, `WEB_DIST_DIR` static serving | not needed: pages and API are the same origin |
| `res.cookie` / `cookie-parser` | `src/server/http/cookies.ts` (same `cq_session` cookie flags) |
| `pino-http` | one `request` log line per API call from `route()` |
| `backend/.env` + root `.env` | one root `.env` |

## Kept the same
- Every `/api` path, method, status code, response body, error code and cookie. The full API suite runs unchanged
  apart from its harness: `tests/api/nextApp.ts` serves the route handlers to Supertest in-process.
- The UI and every screen. Unit tests render the real `src/app` tree via `src/test/nextApp.tsx` with an in-memory
  `next/navigation` (`src/test/nextMock.tsx`).

## Consequences
- One build, one deploy, one port (3000 in dev).
- Next.js inserts a hidden `role="alert"` route announcer, so E2E specs scope alert lookups to `main`. Client
  navigation is now asynchronous, so specs wait for the URL before they inspect the new page.
- Rate-limit counters live in each server process. A multi-instance or serverless deploy needs a shared store.
- The old Express deploy tests for `WEB_DIST_DIR` were removed. Next.js serves the pages itself.
