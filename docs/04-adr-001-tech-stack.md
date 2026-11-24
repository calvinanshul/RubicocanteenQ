# Stage 4 — ADR-001: Technology Stack for CanteenQ

| | |
|---|---|
| **Status** | Accepted (**v2**: supersedes v1, which chose Option A) |
| **Date** | v1 _<date>_ · v2 18 Nov 2026 |
| **Decider** | _<your name>_ |
| **Related** | `02-requirements.md` (NFR1–NFR7), `05-architecture.md`, `06-build-tasks.md` |

## 1. Context

I need to build, test and deploy a full-stack web app in **one week**, working alone. It must have:

- authentication with hashed passwords and **4 roles** (server-side RBAC);
- a relational data model with **transactional, concurrency-safe stock deduction** (BR2: no overselling) and slot capacity;
- QR code generation and camera scanning, CSV export and (Should) email;
- a responsive UI that follows the chosen **Stitch "Fresh Counter" design** (exported as Tailwind HTML);
- **unit, API and UI test automation**, plus one non-functional (load) test;
- **free-tier hosting only**.

The deciding constraints are **time to build**, **testability** and **my own skills**, because the judges look at every stage and will ask me to explain any line of code.

> **Skill note (honest input to the scores):** I'm most comfortable with **React and Node/Express**, and I use JavaScript/TypeScript test tools in my QA work. I have less hands-on experience with Next.js server features (App Router, server components, route handlers).

## 2. Options considered

### Option A — Next.js (full-stack TypeScript) + Prisma + PostgreSQL (Neon), hosted on Vercel
One codebase: React UI and API route handlers in the same Next.js app. One deployment.

### Option B — React (Vite) SPA + Node/Express REST API + Prisma + PostgreSQL (Neon)
Two apps in one repository (npm workspaces): a React single-page app (static files) and an Express API, each hosted separately. A shared package holds the Zod schemas and types.

### Option C — Spring Boot (Java) + React + PostgreSQL
A Java back end (Spring Security, JPA) with a React front end.

## 3. Comparison

Scores: 1 (poor) to 5 (excellent). The weights reflect the challenge: time and testability matter most.

| Criterion | Weight | A: Next.js | **B: React + Express** | C: Spring Boot + React |
|---|---|---|---|---|
| **Personal skill** | 20% | 3: React is familiar, but App Router and server components are new to me | **5**: the stack I know best | 2: Java is not my daily language |
| **Time to build** (one week, solo) | 25% | 5: one project, one deploy, no CORS | **4**: two apps, but a shared package removes duplicated types, and an `/api` proxy on the web host removes most CORS and cookie work | 2: most boilerplate; two languages |
| **Hosting cost** (free tier fit) | 15% | 5: Vercel + Neon; no sleeping server | **3**: static hosting + Neon are fine; a free always-on API host sleeps when idle, so the first request is slow | 2: same sleep issue, plus JVM memory pressure |
| **Testability** | 25% | 4: Vitest + Playwright, but API tests need a running Next server | **5**: Vitest; **Supertest calls the Express app in-process** (fast, no server, easy DB set-up); Playwright for UI | 4: excellent JUnit + MockMvc, but a separate UI test stack |
| **Scalability** | 15% | 4: serverless scales automatically | **4**: stateless API scales horizontally; frontend is a CDN-hosted static site | 5: mature and very scalable |
| **Weighted score** | 100% | 4.20 | **4.30** | 2.95 |

*(A: 0.60 + 1.25 + 0.75 + 1.00 + 0.60 = 4.20 · B: 1.00 + 1.00 + 0.45 + 1.25 + 0.60 = 4.30 · C: 0.40 + 0.50 + 0.30 + 1.00 + 0.75 = 2.95)*

**This is a close call between A and B.** B wins on my skills and on testability. A wins on deployment simplicity. Section 6 records how the hosting weaknesses of B are handled.

### What changed between v1 and v2

| | v1 (Option A) | v2 (Option B) |
|---|---|---|
| Skill scores | Assumed equal skill for A and B (4/4) | Corrected to my real experience: A 3, B 5 |
| Testability | A 5, B 4 | Re-assessed: Supertest's in-process API testing is simpler and faster than running a Next server for API tests, so A 4, B 5 |
| Result | A 4.65 > B 3.60 | B 4.30 > A 4.20 |
| Extra reason | — | The project plan is split into **frontend and backend tasks**; two apps make that boundary explicit, and the REST API is clearly visible and testable on its own |

> Lesson for the retrospective: my first scoring used assumed skill levels. Re-scoring with honest inputs changed the decision.

## 4. Decision

**Option B: React + Vite (frontend) and Node.js + Express (backend), TypeScript throughout, Prisma + PostgreSQL (Neon), in one npm-workspaces monorepo.**

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) in both apps | Type safety from the database to the UI |
| Repo | npm workspaces: `frontend`, `backend`, `shared` | One repo and one CI; shared code without publishing packages |
| Frontend | React 18 + **Vite** + React Router | Fast dev server; simple client-side routing |
| Data fetching | **TanStack Query** | Caching, polling (live order status, queue), retries |
| Forms | react-hook-form + Zod resolver | Uses the shared schemas, so UI and API validation always match (M15) |
| Styling | **Tailwind CSS** with the Stitch "Fresh Counter" tokens | The Stitch export is Tailwind HTML, so the theme and classes carry over directly |
| Fonts and icons | `@fontsource/plus-jakarta-sans`, `@fontsource/jetbrains-mono`, Material Symbols Outlined | As specified in the design system |
| Backend | Node 20 + **Express** | Small, well known, every line is easy to explain |
| Validation | **Zod** (in `shared`) | One set of rules for both apps |
| ORM / DB | Prisma + PostgreSQL | Transactions and conditional updates for stock; CHECK rules and partial indexes |
| Auth | Custom: **bcrypt** (cost 12) + signed JWT (`jose`) in an **httpOnly, Secure, SameSite=Lax** cookie | Full control of roles and lockout |
| API security | `helmet`, `express-rate-limit`, `cookie-parser`, `cors` (locked to the frontend origin) | OWASP basics |
| Logging | `pino` | Structured logs; no secrets |
| QR | `qrcode` (server-side PNG) + `html5-qrcode` (camera scanner in the browser) | Integration requirement |
| CSV | Server-side generation with formula-injection escaping | Integration requirement (S01) |
| Email (Should) | Planned: Resend. **Built:** SMTP through `nodemailer`, with **Brevo** on the live site (Ethereal or off for development and tests) | Any SMTP provider works without code changes; failures never block the request |
| Scheduler (Should) | **GitHub Actions scheduled workflow** → `POST /api/cron/no-show` | Runs on schedule without an always-on process |
| Frontend hosting | Static hosting with an `/api/*` **proxy rewrite** to the API | The browser sees one site: cookies stay first-party and CORS is barely needed |
| API hosting | Free Node web service | Free Node hosting |
| Database hosting | **Neon** free tier (pooled connection string) | Serverless Postgres, branches for dev and test |
| Unit tests | **Vitest** | Fast, TS-native, same in both apps |
| API tests | **Supertest + Vitest** | Calls the Express `app` in-process; no server or network needed |
| UI tests | **Playwright** (desktop + mobile projects) | Golden path across two browser contexts; responsive checks |
| Load test | **k6** | Scriptable; thresholds give a pass or fail result |
| CI | GitHub Actions | Lint, typecheck, unit, API and UI tests for both apps |

## 5. Why the other options were rejected

- **Option A (Next.js):** a strong option and only 0.1 behind. It was rejected because I'd be learning App Router and server components during a one-week challenge. Every unfamiliar line is a risk when judges ask me to explain my code, and the API tests would need a running Next server.
- **Option C (Spring Boot):** the best long-term scalability and very good back-end test tooling, but two languages, the most boilerplate, JVM memory pressure on free tiers, and my lowest skill score. Not realistic in one week.

## 6. Consequences

**Positive**
- A clear frontend/backend boundary that matches the build task list (`06-build-tasks.md`).
- The REST API can be tested fully on its own with Supertest, which is fast and makes the traceability matrix easy to fill.
- No server-side rendering concepts to explain; the request flow is plain Express middleware.

**Negative / risks and how they are handled**

| Risk | Mitigation |
|---|---|
| **Cross-site cookies** (frontend and API on different domains) could be blocked by browsers | A rewrite on the web host: `/api/*` → the API. The browser only talks to one domain, so the cookie stays first-party with `SameSite=Lax`. Vite's `server.proxy` does the same locally |
| **Slow first requests** (serverless cold starts) | The UI shows a loader (top progress bar and spinner) if a request takes over 1 s |
| Two apps mean two builds and two sets of settings | One monorepo and one CI pipeline; frontend settings are only `VITE_API_BASE=/api` |
| Prisma has no native **partial unique index** (needed for BR4) | One raw SQL migration |
| Custom auth is easy to get wrong | Unit tests for hashing, lockout and expiry; RBAC API tests for every role; OWASP checklist review |
| An in-process `node-cron` would not run on serverless hosting | A GitHub Actions schedule calls the cron endpoint instead (with a secret) |
| Free-tier limits (DB storage, build minutes, email quota) | Fine for a demo and pilot; check the current limits on each provider's pricing page before go-live |

## 7. Revisit when

- Real users depend on it: move the API to a paid always-on instance (or any container host) to remove the idle sleep.
- More than one canteen or site is needed (W04), or there are more than about 2,000 daily orders: add a queue for notifications and consider read replicas.
- The company requires SSO (W03): add OIDC with Passport.js or a hosted identity provider.
