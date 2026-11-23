# Stage 6a — Build Plan & Git Conventions

## 1. One-week plan

> The detailed, task-by-task version of this plan (FE and BE, with dependencies and estimates) is [`06-build-tasks.md`](06-build-tasks.md).

| Day | Focus | Output / exit criteria | Stories |
|---|---|---|---|
| **Day 1** | Stages 1–5 docs; repo set-up | `docs/01–05` committed; monorepo with `frontend` (React + Vite + Tailwind with Fresh Counter tokens), `backend` (Express + Prisma) and `shared`; CI runs lint and typecheck; Neon DB connected; first deploy: web on Netlify with the `/api` proxy, API on Render (`/api/health` responds) | — |
| **Day 2** | Auth + RBAC + Admin | Sign-up, login, logout, session, lockout; `authenticate` + `requireRole` middleware; React Router guards; Users page; Settings page; seed script; **unit tests for password, session and guard** | US-01–05 |
| **Day 3** | Menu + ordering core | Menu items CRUD; daily menu editor; **S3 menu + S4 checkout (Stitch design)**; **place order with atomic stock update and slot capacity**; cancel; **unit tests for the cut-off and stock rules** | US-06–10 |
| **Day 4** | QR + staff + dashboard | QR generation; **S5 order pass**; My Orders; staff queue; status changes; scan/verify; prep list; **S10 dashboard** | US-11–14 |
| **Day 5** | Validation polish, responsive, Should features | Shared Zod error display; mobile layouts; CSV export (S01); email (S02) if time allows | US-15–19 |
| **Day 6** | Testing | API and UI automation complete; traceability matrix; k6 load test run and results recorded; bug fixing; bug log | Stage 7 |
| **Day 7** | Hardening + demo | Final deploy; demo data reset; demo rehearsal (time it); retrospective; README | Stage 8 |

**Rule:** if Day 3 slips, Should features are dropped first, never tests.

## 2. Branching

- `main` is always deployable and protected by CI.
- Short-lived branches: `feat/US-09-place-order`, `fix/BUG-004-cutoff-tz`, `test/api-orders`, `docs/adr-001`.
- Merge with a PR, even when working solo, so CI runs and there is a review trail. Reference the story or bug ID in the PR title.

## 3. Commit message convention (Conventional Commits)

```
<type>(<scope>): <short imperative summary> [<story/bug id>]

<optional body: what and why, not how>
```

| Type | Use for |
|---|---|
| `feat` | New user-visible behaviour |
| `fix` | Bug fix (reference a `BUG-xxx` ID) |
| `test` | Adding or changing tests only |
| `docs` | Documentation only |
| `refactor` | Code change with no behaviour change |
| `chore` | Tooling, deps, config, CI |

**Good examples**

```
feat(orders): reject orders after daily cut-off [US-09]
feat(orders): atomic stock decrement to prevent overselling [US-09 AC5]
test(api): RBAC matrix for menu endpoints [US-03]
fix(clock): use IST date for cut-off near midnight [BUG-003]
docs(adr): switch to React + Express after re-scoring [ADR-001 v2]
chore(ci): run Playwright on PRs with Postgres service
```

**Avoid:** `update`, `fix stuff`, `wip`, or one giant commit per day. Aim for **small commits that each leave the build passing**. A useful rule: one commit for each acceptance criterion or test group.

## 4. Definition of Done (each story)

- [ ] All acceptance criteria are implemented
- [ ] UI **and** API validation are in place (shared schema)
- [ ] Unit tests cover the business rules; API tests cover success, error and RBAC cases
- [ ] At least one Playwright UI test covers the happy path
- [ ] The traceability matrix is updated
- [ ] Works at 360 px
- [ ] Any AI-generated code has been reviewed, and the journal is updated
- [ ] CI is green and the change is deployed to a preview

## 5. CI pipeline (`.github/workflows/ci.yml`)

```yaml
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: canteen_test }
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 5s --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/canteen_test
      DIRECT_URL:   postgresql://postgres:postgres@localhost:5432/canteen_test
      SESSION_SECRET: ci-only-secret-at-least-32-characters-long
      ENABLE_TEST_CLOCK: 'true'
      WEB_ORIGIN: http://localhost:4173
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci                                   # installs all workspaces
      - run: npm run build -w shared
      - run: npx prisma migrate deploy && npx prisma db seed
        working-directory: backend
      - run: npm run lint --workspaces && npm run typecheck --workspaces
      - run: npm run test:unit -w backend -- --coverage
      - run: npm run test:unit -w frontend
      - run: npm run test:api -w backend            # Supertest, in-process
      - run: npm run build -w backend && npm run build -w frontend
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e                        # Playwright webServer starts API (:4000) + vite preview (:4173, /api proxied)
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: playwright-report, path: playwright-report }
```

## 6. Scheduled no-show job (`.github/workflows/no-show-cron.yml`, Should S04)

```yaml
name: no-show-cron
on:
  schedule:
    - cron: '*/15 7-10 * * 1-5'   # every 15 min, 12:30–16:15 IST (cron runs in UTC)
  workflow_dispatch: {}
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -sS -X POST "$API_URL/api/cron/no-show" \
               -H "Authorization: Bearer $CRON_SECRET" --max-time 90
        env:
          API_URL: ${{ secrets.API_URL }}
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
```

> GitHub's scheduled runs can be delayed by a few minutes; that's fine for marking no-shows 30 minutes after a slot ends. `--max-time 90` allows for the free API waking up.
