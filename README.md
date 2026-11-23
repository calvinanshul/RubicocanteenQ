# CanteenQ

Office canteen pre-order: employees order lunch before the cut-off, pick a pickup slot and collect with a QR code.
Project documentation lives in [`docs/`](docs/README.md); sprint plans and status in [`docs/sprints/`](docs/sprints/STATUS.md).

> Migrated from the npm-workspaces monorepo (`frontend` React + Vite, `backend` Express, `shared`) to a single
> Next.js app. The REST API contract (`/api/...` paths, request/response shapes, error codes, cookies) is
> unchanged. See [docs/09-adr-002-nextjs-migration.md](docs/09-adr-002-nextjs-migration.md).

## Stack
One Next.js 16 (App Router) app: React 19 + Tailwind (Fresh Counter design) for the pages, Route Handlers for the
API, Prisma + PostgreSQL, Zod schemas shared by both sides.

```
src/
  app/                 Next.js routes
    (public)/          /login, /signup            (PublicOnly guard)
    (employee)/        /menu, /orders, /profile   (EMPLOYEE guard + cart + employee shell)
    staff/             /staff/queue|scan|prep     (STAFF guard + counter shell)
    (console)/         /manager/*, /admin/*       (MANAGER/ADMIN guard + console shell)
    api/               REST API — one route.ts per endpoint
  screens/             page components (client)
  layouts/ components/ features/ lib/ api/     client UI, data hooks and fetch client
  server/              server-only: services, auth, adapters, Prisma client
    http/route.ts      route() wrapper: rate limits, JSON body, session, roles, Zod validation, error JSON
  shared/              Zod schemas, types, constants, money helpers (client + server)
prisma/                schema, migrations, seeds
tests/                 unit/ shared/ api/ (Vitest + Supertest), e2e/ smoke/ (Playwright), perf/ (k6)
```

## Run locally
Requires Node 20.9+ and PostgreSQL 16.

```bash
npm install
cp .env.example .env              # set DATABASE_URL / DIRECT_URL / SESSION_SECRET (+ admin, domains)
createdb canteenq_dev
npm run db:migrate                # apply migrations
npm run db:seed                   # 4 demo users, 6 dishes, today's + tomorrow's menu
npm run db:seed:demo              # optional: today's orders as in the mockups (120 orders, Priya's pass K7Q4MZ)
npm run dev                       # http://localhost:3000 (pages and /api on the same origin)
```

Demo accounts (seed data, demo only): `admin@rubicotech.com` / `Admin@2026`, `manager@rubicotech.com` / `Manager@2026`,
`staff@rubicotech.com` / `Staff@2026`, `priya@rubicotech.com` / `Employee@2026`.

## Tests
| Command | What | Database |
|---|---|---|
| `npm run test:unit` | Vitest: React screens (jsdom, with an in-memory `next/navigation`), server and shared unit tests | — |
| `npm run test:api` | Supertest against the real route handlers, in-process ([tests/api/nextApp.ts](tests/api/nextApp.ts)) | `canteenq_test` (override `TEST_DATABASE_URL`) |
| `npm run test:e2e` | Playwright, desktop + mobile; builds and runs `next start` on :3100 | `canteenq_e2e` (override `E2E_DATABASE_URL`) |
| `npm run lint` · `npm run typecheck` · `npm run build` | Quality gates | — |
| `npm run test:smoke` | Live-site smoke test (reads `SITE_LOGIN_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` from `.env`) | the deployed site |

Create the test databases once: `createdb canteenq_test && createdb canteenq_e2e`. First E2E run: `npx playwright install chromium`.

## Deploy
One Node web service: `npm ci --include=dev && npm run build`, then
`npm run db:deploy && npm run db:seed:prod && npm start` (see [render.yaml](render.yaml)). Never set
`ENABLE_TEST_CLOCK=true` in production: the server refuses the configuration.

Rate limits are kept in memory per server instance, which suits this single-instance deploy. A serverless or
multi-instance deploy (e.g. Vercel) needs a shared store for them.
