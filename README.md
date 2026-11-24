# CanteenQ

Office canteen pre-order: employees order lunch before the cut-off, pick a pickup slot and collect with a QR code.
Project documentation lives in [`docs/`](docs/README.md); the four delivery sprints (01–04) and their status are in
[`docs/sprints/`](docs/sprints/STATUS.md). The move to Next.js and Vercel was done after Sprint 04 and is recorded in
[ADR-002](docs/09-adr-002-nextjs-migration.md).

## Live site
**https://rubicocanteen-q.vercel.app/** (hosted on Vercel)

Demo accounts (work on the live site and on a local `npm run db:seed` database):

| Role | Email | Password | Lands on |
|---|---|---|---|
| Employee | `priya@rubicotech.com` | `Employee@2026` | `/menu` |
| Counter staff | `staff@rubicotech.com` | `Staff@2026` | `/staff/queue` |
| Manager | `manager@rubicotech.com` | `Manager@2026` | `/manager/dashboard` |
| Admin | `admin@rubicotech.com` | `Admin@2026` | `/admin/users` |

New employees can also sign up with an `@rubicotech.com` or `@rubicotech.in` email.

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

Log in with the demo accounts listed under [Live site](#live-site).

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
Hosted on Vercel (build command `npm run build`). Set `WEB_ORIGIN` to the site's public URL. Apply
migrations and the production seed against the production database with
`npm run db:deploy && npm run db:seed:prod`. Never set `ENABLE_TEST_CLOCK=true` in production: the server
refuses the configuration.

**Email:** a welcome email goes out on every sign-up, and an email goes to a user when an admin changes their
role. The live site sends them through [Brevo](https://www.brevo.com) SMTP: in Vercel's environment variables set
`MAIL_TRANSPORT=smtp`, `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, `SMTP_USER` (the Brevo SMTP login),
`SMTP_PASS` (a Brevo SMTP key) and `MAIL_FROM` (a sender address verified in Brevo); see `.env.example`. With `MAIL_TRANSPORT=ethereal`
the emails are only captured in a test inbox; with `none` nothing is sent. An email failure never blocks the
sign-up or the role change.

Rate limits are kept in memory per serverless instance, so on Vercel they are per instance, not global;
a shared store (e.g. Redis) would make them exact.
