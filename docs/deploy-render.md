# Deploying CanteenQ on Render

CanteenQ runs on Render as **one web service**: Express serves the API under `/api` and the built React app on every other path. Because the app and the API share one address, there's no proxy. The session cookie stays first-party, and the rate limits see each visitor's real IP address.

`render.yaml` (a Render Blueprint) describes the whole setup:

| Resource | Plan | Notes |
|---|---|---|
| `rubicocanteenq` web service | Free | Node 22, Singapore. Sleeps after 15 minutes without traffic, and the first request after that takes about 30–60 s. |
| `rubicocanteenq-db` Postgres 16 | Free | **Expires 30 days after it's created**, and Render deletes it 14 days after that unless you upgrade it. Upgrade it before real use. |

## What happens on each deploy

1. **Build:** `npm ci --include=dev && npm run build` builds the shared package, then the backend (`prisma generate` and `tsc`), then the frontend (Vite, into `frontend/dist`). `--include=dev` is needed because Render sets `NODE_ENV=production`, which would otherwise skip the devDependencies the build (and the `tsx` seed below) rely on.
2. **Start:** the start command runs three steps. The free plan has no shell and no pre-deploy step, so all three run on every start. Each one is safe to repeat:
   - `prisma migrate deploy` applies any new migrations.
   - `db:seed:prod` sets up the first admin. See [Production seed](#production-seed).
   - The server starts, with `WEB_DIST_DIR=../frontend/dist` so it also serves the React app.
3. **Health check:** `GET /api/health` must answer `{"status":"ok","db":"ok"}`.

## First-time setup

1. **Put the code on GitHub.** Render can't connect to the self-hosted GitLab at git.rubico.tech.
   - Create an empty **private** repository on GitHub.
   - Push `main` to it, for example: `git remote add github <url> && git push github main`.
2. **Create the Blueprint.** In Render, go to **New → Blueprint**, connect GitHub and pick the repository. Render reads `render.yaml` and asks for these values:
   - `ADMIN_EMAIL`: the first admin's login, for example `admin@rubicotech.in`.
   - `ADMIN_PASSWORD`: 8–64 characters, with at least one letter and one number.
   - `ETHEREAL_USER` and `ETHEREAL_PASS`: an Ethereal login for the welcome email. See [Email](#email).
3. **Apply.** Render creates the database and the web service, then builds and starts the app.
   - `SESSION_SECRET` and `CRON_SECRET` are generated automatically.
   - `WEB_ORIGIN` is taken from Render's `RENDER_EXTERNAL_URL`.
4. **Check it.** Open `https://rubicocanteenq.onrender.com`, log in as the admin, and check **Settings & Rules**.

## Production seed

`npm run db:seed:prod` (`backend/prisma/seed-prod.ts`) differs from the local `db:seed` in four ways:

- **No demo data:** it creates no demo accounts, dishes or menus. The demo passwords (`Admin@2026` and the rest) never exist in production.
- **Settings once:** it creates the Settings row only on the very first start, with `ALLOWED_EMAIL_DOMAINS`. Later starts never change Settings, so an admin's edits survive restarts.
- **Admin:** it creates the admin from `ADMIN_EMAIL` and `ADMIN_PASSWORD` if the account doesn't exist, and never changes an existing password.
  - **Re-activated on every start:** if that account is later demoted or disabled, the next start makes it an active admin again, so you can always get back in.
  - **Removing the admin:** to retire that admin, first clear `ADMIN_EMAIL` and `ADMIN_PASSWORD` in Render (once another active admin exists), then demote the account.
- **No-admin guard:** it refuses to start the service if no active admin would exist.

## Email

Every sign-up sends a "Welcome to CanteenQ" email. The Blueprint sets `MAIL_TRANSPORT=ethereal`, so nothing is actually delivered: each email's preview link appears in the service's **Logs**, and you can read it at https://ethereal.email/messages after logging in.

- **Get a login:** click **Create Ethereal Account** at https://ethereal.email and paste the user and password into Render. If you leave both empty, the app creates a throwaway account on the first email and prints its login in the log. That account is lost on every restart, and the free plan restarts often.
- **Real delivery:** set `MAIL_TRANSPORT=smtp` and add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` and `SMTP_PASS`. Use a `MAIL_FROM` address that server is allowed to send from.
- **Turning it off:** set `MAIL_TRANSPORT=none`.

A failed email is only logged. It never blocks a sign-up.

## Auto no-show job

The GitHub repository runs `.github/workflows/no-show.yml` every 15 minutes during lunch on weekdays. Add these two **repository secrets** in GitHub:

- `API_URL`: the service URL, for example `https://rubicocanteenq.onrender.com`.
- `CRON_SECRET`: copy the value from the Render service's **Environment** tab.

On the free plan, each call also wakes the service if it's asleep.

## Connecting with DBeaver

The database accepts no outside connections (`ipAllowList: []`). To connect:

1. In Render, open the database's **Access Control** and add your IP address.
2. Use the **External Database URL** from the database's **Info** tab.
3. Remove your IP address again when you're done.

## Updating

Push to `main` on GitHub and Render deploys automatically. New migrations run on the next start.
