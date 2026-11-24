# Sprint 01 · Foundation & Access

**Goal:** Deployable walking skeleton. Anyone with a company email can sign up, each role logs in to its own home, and the manager can publish a daily menu.
**Stories:** ST-00 Foundation (5) · ST-01 Access (5) · ST-02 Daily menu (5) = 15 pts
**Source:** `docs/06-sprint-plan.md §2` · ACs taken from `03-user-stories.md` (US-01, US-02, US-03, US-07) · tasks from `06-build-tasks.md` · UI from `design/CanteenQ_UI_Design_Final.md`

> `03-user-stories-v2.md` (ST-xx definitions) and `06-claude-code-prompts.md` (C01–C46) don't exist, so the ST stories are mapped to the US acceptance criteria below.

## ST-00 · Foundation

| AC | Acceptance criterion | Tests |
|---|---|---|
| 00-1 | npm-workspaces monorepo: `frontend`, `backend`, `shared`; root scripts `dev`, `build`, `lint`, `typecheck`, `test:unit`, `test:api`, `test:e2e`; strict `tsconfig.base.json` | CI / self-check |
| 00-2 | `shared` exports roles, statuses, categories, error codes, money helpers (`toPaise`, `formatINR`) and Zod schemas for auth, settings, menu item and daily menu | TC-U-09, TC-U-11 (schema part), TC-U-12, TC-U-15 |
| 00-3 | API env validated with Zod at start-up (`.env.example` committed); start-up fails if `ENABLE_TEST_CLOCK=true` and `APP_ENV=production` | TC-API-SYS-02 |
| 00-4 | Standard error JSON `{error:{code,message,fields?}}`; malformed JSON → `400 INVALID_JSON`; unknown route → 404; unexpected → `500 INTERNAL_ERROR` with no stack trace | TC-API-VAL-01, TC-API-VAL-02 |
| 00-5 | `GET /api/health` → 200 `{status:"ok", db:"ok", time}`; 503 when the DB is down | TC-API-SYS-01 |
| 00-6 | Prisma schema per `05-data-model.md §3`, plus a raw SQL migration with the partial unique indexes and CHECK constraints (§2) | DB constraint checks |
| 00-7 | Seed: 4 role users (`05-data-model.md §5`, with employeeCode/department), settings row (pickupLocation "Building 4 · Counter A"), the 6 design dishes, and today's and tomorrow's daily menu | Seed runs; login works |
| 00-8 | IST clock: `now(req)`, `todayIST()`, `x-test-now` honoured only when `ENABLE_TEST_CLOCK=true` | TC-U-04, TC-API-SYS-02 |
| 00-9 | Web: Vite + React + TS + Tailwind with the Fresh Counter tokens (§2 of the UI spec), Plus Jakarta Sans + JetBrains Mono, Material Symbols, React Router, TanStack Query; `/api` dev proxy | Smoke E2E |
| 00-10 | CI workflow `.github/workflows/ci.yml` (lint, typecheck, unit, API, build, E2E) | File present and runs locally |
| 00-11 | Deploy config (`/api/*` proxy + SPA fallback) and build/start commands documented | Config review |

## ST-01 · Access (sign up, log in, roles)

| AC | Acceptance criterion | Tests |
|---|---|---|
| 01-1 | UI kit used by Sprint 1–2 screens: Button, Input/Select, DietMarker, Badge/Pill, Card/Ticket, Dialog, Toast, Alert, Avatar, Wordmark, Switch; `/dev/ui` gallery (dev only) | Visual check |
| 01-2 | US-01 AC1: valid sign-up → 201, role EMPLOYEE, httpOnly SameSite=Lax cookie, lands on `/menu`; no `passwordHash` in the response | TC-API-AUTH-01, TC-UI-01 |
| 01-3 | US-01 AC2: non-company domain → 403 `DOMAIN_NOT_ALLOWED`; UI shows the error inline with no network call | TC-API-AUTH-02, TC-UI-01 |
| 01-4 | US-01 AC3 + AC5: duplicate email (case-insensitive, trimmed) → 409 `EMAIL_EXISTS` | TC-API-AUTH-03 |
| 01-5 | US-01 AC4: weak password → 400 with `fields.password`; live rule checklist on S2 | TC-API-AUTH-08 |
| 01-6 | US-01 AC6: bcrypt cost 12 | TC-U-08 |
| 01-7 | US-02 AC1: login → home per role (Employee `/menu`, Staff `/staff/queue`, Manager `/manager/dashboard`, Admin `/admin/users`) | TC-UI-02 |
| 01-8 | US-02 AC2: identical 401 for an unknown email and a wrong password | TC-API-AUTH-04 |
| 01-9 | US-02 AC3: 5 failures in 15 min → 429 `TOO_MANY_ATTEMPTS`, even with the right password | TC-U-14, TC-API-AUTH-05 |
| 01-10 | US-02 AC4: disabled account → 403 `ACCOUNT_DISABLED` | TC-API-AUTH-06 |
| 01-11 | US-02 AC5: logout → 204, cookie cleared, `/me` → 401; Back shows the login page | TC-API-AUTH-07, TC-UI-02 |
| 01-12 | US-02 AC6: expired session → 401 `SESSION_EXPIRED`; UI goes to `/login?expired=1` with a banner | TC-API-AUTH-09 |
| 01-13 | US-03 AC1/AC2: role nav per UI spec §4; wrong role on a route → `/403` page (S17) | TC-UI-03 |
| 01-14 | US-03 AC5: protected endpoints without a cookie → 401 `UNAUTHENTICATED` | TC-API-RBAC-02 |
| 01-15 | US-03 AC2 (API): EMPLOYEE `POST /api/menu-items` → 403 | TC-API-RBAC-05 |
| 01-16 | US-03 AC6: role and active flag re-read from the DB on every request (demotion applies straight away) | TC-API-RBAC-06 |
| 01-17 | Three layout shells (employee mobile/desktop, staff counter, console) with placeholder home pages for routes built in later sprints | TC-UI-02 |

## ST-02 · Daily menu (manager publishes)

| AC | Acceptance criterion | Tests |
|---|---|---|
| 02-1 | `GET /api/menu-items` (M1, MANAGER) returns active dishes | TC-API-RBAC-05 |
| 02-2 | US-07 AC1: `PUT /api/daily-menu/:date` (M5) saves entries; `GET /api/daily-menu?date=` (M4) returns items with `remaining = quantity`, `orderingOpen`, `cutoff`, `closed`, `pickupLocation` | TC-API-MENU-05 |
| 02-3 | US-07 AC2: quantity below already ordered → 409 `QTY_BELOW_ORDERED` | TC-API-MENU-06 |
| 02-4 | US-07 AC3–AC5: qty 0, −1, 1.5, a duplicate item or a past date → 400 | TC-API-MENU-07 |
| 02-5 | M4 for a date with no menu → 422 `MENU_NOT_PUBLISHED`; a closed weekday → `closed: true` | TC-API-MENU-08 |
| 02-6 | S13 Daily menu editor: date stepper, On-menu switch, Portions input, Already ordered, at-a-glance panel, error summary, Save → toast; past date read-only | TC-UI-05 (daily-menu part) |

## Exit demo
- [ ] Sign up as a new employee → land on the (placeholder) menu
- [ ] Log in as staff, manager and admin → each lands on its own home; an employee opening `/manager/dashboard` sees 403
- [ ] As manager, publish tomorrow's menu; a quantity below "already ordered" shows the error
- [ ] lint, typecheck, unit, API and build all green

## Out of scope for this sprint
- **Live deployment and the live cookie check (SET-12..14):** these need your accounts. The config files are in scope; deploying is a manual step for you.
- Menu catalogue CRUD screens (S11/S12, Sprint 4); employee menu screen S3 (Sprint 2); users and settings screens (Sprint 4).
- Full RBAC matrix TC-API-RBAC-01 (Sprint 4 hardening).

## Environment
Local Postgres 16 (Homebrew) with databases `canteenq_dev` and `canteenq_test`.
