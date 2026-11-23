# Sprint 07 · Release on Netlify

**Goal:** The Next.js CanteenQ is live on Netlify with a hosted Postgres. Migrations, the admin seed, email and the auto no-show job all work there. Render hosting is retired.
**Type:** Deploy / release.

## Acceptance criteria (committed)

| AC | Criterion | Tests |
|---|---|---|
| 07-1 | Root `netlify.toml` builds the Next app with the Netlify Next.js runtime (OpenNext adapter). It uses Node 22, base = repo root, and builds `shared` + `backend` + `frontend`. The old Vite `frontend/netlify.toml` and its `/api` proxy are removed. | deploy |
| 07-2 | Postgres on **Neon** (free tier, Singapore/closest region). `DATABASE_URL` = pooled connection (`pgbouncer=true&connection_limit=1`), `DIRECT_URL` = direct, for migrations. Prisma `binaryTargets` includes the Netlify function runtime (`rhel-openssl-3.0.x`). | smoke |
| 07-3 | `prisma migrate deploy` and `db:seed:prod` run in the Netlify build. Both are safe to repeat. A build fails if a migration fails. | deploy log |
| 07-4 | Env vars documented and set in Netlify: `APP_ENV`, `SESSION_SECRET`, `CRON_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `ALLOWED_EMAIL_DOMAINS`, `ADMIN_*`, `MAIL_*`, `ETHEREAL_*`. `WEB_ORIGIN` falls back to Netlify's `URL`. `.env.example` updated. | API test on env parsing |
| 07-5 | Auto no-show: a Netlify **Scheduled Function** (same cron `*/15 7-10 * * 1-5`) calls `noShowService`. The GitHub Action `no-show.yml` is removed. | unit test + manual trigger |
| 07-6 | Session cookie is `Secure` + `HttpOnly` + `SameSite=Lax` on the Netlify domain. Rate limiter reads the real client IP (`x-nf-client-connection-ip`). | smoke |
| 07-7 | `render.yaml` and `docs/deploy-render.md` removed. New `docs/deploy-netlify.md` covers first-time setup (Neon, Netlify import, env vars), email, cron, DB access, updating and rollback. | review |
| 07-8 | Playwright smoke suite (`npm run test:smoke`) passes against the live Netlify URL: health, login as admin, place and collect an order, CSV export. | test:smoke |

## Manual / outside the loop
Creating the Neon project and the Netlify site, and pasting secrets, need the user's accounts. The skill prepares everything and pauses for those steps.

## Out of scope
Custom domain · paid plans · load testing (TC-NFR-01/02).
