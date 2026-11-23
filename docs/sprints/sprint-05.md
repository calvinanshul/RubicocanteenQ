# Sprint 05 · Next.js Foundation & API on Route Handlers

**Goal:** CanteenQ runs as one Next.js (App Router) app. Express and Vite are gone, every existing API endpoint and page works exactly as before, and the full existing test suite passes.
**Type:** Technical migration (no new user stories). Behaviour must not change. Every Sprint 01–04 acceptance criterion still holds.

## Target layout

The backend/frontend/shared split stays:

| Package | After this sprint |
|---|---|
| `shared/` | Unchanged: zod schemas, DTOs, domain helpers. |
| `backend/` | A library, no server. Prisma, `services/`, `auth/`, `adapters/`, plus a new `backend/src/http/` with one handler module per old Express router. Each one is a framework-neutral function `(Request) => Response`, with zod validation, the same error envelope, status codes and cookies as today. |
| `frontend/` | The Next.js app. `app/api/**/route.ts` files only re-export handlers from `@canteenq/backend/http`. `app/**/page.tsx` renders the existing page components (client components for now). |

## Acceptance criteria (committed)

| AC | Criterion | Tests |
|---|---|---|
| 05-0 | **Pre-migration safety net.** Before any migration code, add E2E for the 7 flows found untested on 2026-11-23 (profile + logout; my orders with a real order; disable/re-enable user; edit employee ID/department; settings domains/holidays/discard/validation; catalogue edit/archive/restore; logged-out deep link `?next=`). They pass on the **current** Express + Vite app. | EC-04-UI14+ in `frontend/tests/e2e/sprint04/coverage.spec.ts` |
| 05-1 | Next.js 15 App Router app in `frontend/` builds with `next build`. Vite, `react-router-dom`, `index.html`, `main.tsx` removed. | build |
| 05-2 | All 12 API route groups (`health, time, auth, users, settings, closed-dates, menu-items, daily-menu, slots, orders, reports, cron`) are served from `app/api/**/route.ts`. Paths, methods, request/response bodies, status codes, error envelope and `cq_session` cookie attributes are identical. | all existing API tests |
| 05-3 | Express, `cors`, `cookie-parser`, `helmet`, `pino-http`, `express-rate-limit`, `server.ts`, `webApp.ts` removed. Helmet-equivalent security headers are set in `next.config` `headers()`. Request logging uses `pino` with the same redaction. | API test on headers |
| 05-4 | Rate limits keep working on serverless: a **Postgres-backed** fixed-window limiter (new Prisma model + migration) gives 300 req/min per IP on `/api/*` and 50 per 15 min on login/signup, with the same `TOO_MANY_ATTEMPTS` 429 body. Client IP comes from `x-nf-client-connection-ip`, then `x-forwarded-for`. Skipped when `APP_ENV=test`. | new unit + API tests |
| 05-5 | Test clock (`ENABLE_TEST_CLOCK`) still works through the handler layer. | existing E2E that use it |
| 05-6 | Every URL from the old React Router table (`/`, `/login`, `/signup`, `/menu`, `/menu/checkout`, `/orders`, `/orders/[id]`, `/profile`, `/staff/{queue,scan,prep}`, `/manager/{dashboard,exports,daily-menu,menu-items}`, `/admin/{users,settings}`, `/403`, `/404`, unknown → 404, `/dev/ui` dev-only) renders the same screen. Shells/layouts become Next `layout.tsx` route groups. Role gating behaves the same (client-side `RequireRole` is acceptable this sprint). | all existing E2E |
| 05-7 | Backend API tests (Supertest) ported to call the route handlers via `Request` objects. Same cases, same assertions. No test deleted or weakened. | `npm run test:api` |
| 05-8 | `npm run dev` starts one process (`next dev`). Root scripts (`build`, `typecheck`, `lint`, `test:*`, `db:*`) still work. Playwright starts `next start`. | self-check |

## Out of scope
Server Components / Server Actions (Sprint 06) · Netlify deploy, Render removal (Sprint 07) · any UI or behaviour change.

## Risks
- Supertest port is the largest single task (~3.2k lines of API tests). A small `callRoute(method, path, {body, cookie})` helper keeps the assertions unchanged.
- `/dev/ui` must stay unreachable in production builds.

## Found while building AC 05-0

**BUG-05-001 [major] `?next=` is never honoured; login always lands on the role home.**
`RequireRole` redirects a logged-out visitor to `/login?next=<path>`, and `LoginPage` has code to
follow that path on success — but `/login` sits inside `PublicOnly`, which renders
`<Navigate to={ROLE_HOME[role]} replace />` as soon as the session lands. That redirect wins, so the
`navigate(next)` in the login mutation's `onSuccess` never takes effect, for any role or any path.
A deep link to `/admin/settings` logs in and lands on `/admin/users`; `/orders` lands on `/menu`.

Current (broken) behaviour is pinned by **EC-04-UI21** so the migration cannot change it in either
direction unnoticed. Fixing it is a behaviour change, so it is deliberately **not** part of this
sprint's safety net — decide whether to fix it before 05-1 or carry it as a known defect. When it is
fixed, EC-04-UI21's two "lands on the role home" assertions become the deep-link path instead.

**Flake watch: `TC-UI-10` in `sprint03/counter.spec.ts`.** It failed once under 2 workers
(`getByRole('alert')` never appeared after re-scanning a handed-over code) and then passed in three
consecutive full-suite runs, alone and alongside the new file. Pre-existing timing fragility, made
easier to hit by the extra parallel load. Not changed here; worth a watch in Sprint 05 testing.
