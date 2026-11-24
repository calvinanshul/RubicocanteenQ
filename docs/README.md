# CanteenQ — Office Canteen Pre-order · Project Documentation

> **Topic #3:** *Let employees order lunch before they reach the canteen.*
> QA Coding Challenge — Round 2: Topic to Product

**Live app:** <https://rubicocanteen-q.vercel.app/> (pages and `/api` on one Next.js app, hosted on Vercel) · **Repo:** _<link>_ · **Author:** _<name>_

## Stage map

| # | Stage | Deliverables | Status |
|---|---|---|---|
| 1 | Discovery | [01-discovery.md](01-discovery.md): problem statement, 4 personas, 15 assumptions, interview guide | ☐ |
| 2 | Requirements | [02-requirements.md](02-requirements.md): MoSCoW (17 Must / 7 Should / 7 Could / 8 Won't), business rules, NFRs, MVP definition, change log and **design decisions D1–D21** | ☐ |
| 3 | User stories | [03-user-stories.md](03-user-stories.md): 20 stories, Given/When/Then, negative and edge cases | ☐ |
| 4 | Tech stack decision | [04-adr-001-tech-stack.md](04-adr-001-tech-stack.md): 3 options, weighted comparison, rejected options explained; **v2 decision: React + Express** · [09-adr-002-nextjs-migration.md](09-adr-002-nextjs-migration.md): move to Next.js | ☐ |
| 5 | Architecture and design | [05-architecture.md](05-architecture.md) · [05-data-model.md](05-data-model.md) (ER) · [05-api-spec.md](05-api-spec.md) · [05-wireframes.md](05-wireframes.md) (5 screens) · [05-ui-design-requirements.md](05-ui-design-requirements.md) (design brief) · [design/](design/) (Stitch "Fresh Counter" design: 4 screens + design system) | ☐ |
| 6 | Build with AI | [06-build-plan.md](06-build-plan.md) (plan, commits, CI) · [06-build-tasks.md](06-build-tasks.md) (FE/BE task list) · [06-ai-prompt-journal.md](06-ai-prompt-journal.md) · [sprints/](sprints/STATUS.md) (Sprints 01–04) | ☐ |
| 7 | Testing | [07-test-strategy.md](07-test-strategy.md) · [07-test-cases.md](07-test-cases.md) (120 cases) · [07-traceability-matrix.md](07-traceability-matrix.md) · [07-bug-log.md](07-bug-log.md) · [07-non-functional-test.md](07-non-functional-test.md) | ☐ |
| 8 | Demo and retrospective | [08-demo-script.md](08-demo-script.md) · [08-retrospective.md](08-retrospective.md) | ☐ |

## Common minimum requirements: compliance

| # | Minimum | How CanteenQ meets it | Evidence |
|---|---|---|---|
| 1 | ≥ 3 user roles with RBAC | 4 roles: Employee, Staff, Manager, Admin; server-side guard on every API | US-03, `05-architecture.md §3`, TC-API-RBAC-01..06 |
| 2 | Authentication (sign-up, login, logout, hashing) | Company-domain sign-up, login with lockout, logout, bcrypt cost 12 | US-01, US-02, TC-U-08 |
| 3 | ≥ 1 integration | **QR code** (pickup) + **CSV export** (reports) + **email** via Brevo SMTP (welcome and role-change emails) | US-11, US-13, US-17, US-01 AC7, US-04 AC6 |
| 4 | Validation on UI and API | Shared Zod schemas; standard error JSON | US-15, TC-API-VAL-*, TC-UI-01 |
| 5 | Dashboard / report | Manager/Admin dashboard + prep list + CSV | US-14, US-17 |
| 6 | Responsive UI | Mobile-first; tested at 360 / 768 / 1280 px | US-16, TC-UI-12 |

> The brief says "8 minimums" but lists 6. All 6 are covered (see `01-discovery.md §3.1`).

## Stack at a glance
**App:** Next.js 16 (App Router, TypeScript) · React 19 · TanStack Query · Tailwind (Fresh Counter design) · Route Handlers for the API · hosted on Vercel

**Data and auth:** Prisma · PostgreSQL (Supabase) · Zod (shared) · bcrypt + JWT cookie · `qrcode` · email through Brevo SMTP (`nodemailer`)

> Built as React + Vite and Express (ADR-001 v2) in Sprints 01–04, then moved to one Next.js app ([ADR-002](09-adr-002-nextjs-migration.md)).

**Testing:** Vitest · Supertest · Playwright · k6 · GitHub Actions. *Rationale in ADR-001 v2.*

## Demo accounts *(seed data; demo only)*
`admin@rubicotech.com` · `manager@rubicotech.com` · `staff@rubicotech.com` · `priya@rubicotech.com`. Passwords are in `05-data-model.md §5`.

## Diagrams
All diagrams are written in **Mermaid** and render directly on GitHub and GitLab. To export images, paste them into <https://mermaid.live>.
