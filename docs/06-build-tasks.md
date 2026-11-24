# Stage 6c — Build Task List (Frontend + Backend)

**Purpose:** a step-by-step list of every task needed to build CanteenQ, from an empty repo to a deployed, tested app.
**Stack (ADR-001 v2, Option B):** `frontend` React + Vite + TypeScript + Tailwind · `backend` Node + Express + TypeScript + Prisma · `shared` Zod schemas · PostgreSQL on Neon · Vitest, Supertest, Playwright, k6.
**Design source:** Stitch export `stitch_canteenq_lunch_pre_order_system` → **"Fresh Counter"** design system (`fresh_counter/DESIGN.md`) + 4 designed screens (S3, S4, S5, S10).
**Related docs:** requirements (`02`), user stories (`03`), ADR (`04`), architecture / data model / API (`05`), test cases (`07`).

### How to read this list
- **IDs:** `SET-` setup · `BE-` backend · `FE-` frontend · `QA-` testing · `DOC-` documentation & demo
- **Ref:** user story (`US-xx`), API endpoint (`A1`, `O1`… from `05-api-spec.md`), screen (`S3`…), test case (`TC-…`)
- **Est:** rough hours for one person. **Pri:** P1 = Must (MVP) · P2 = Should · P3 = Could
- Work **top to bottom inside each section**. "Depends" lists tasks that must be done first.
- Tick `[ ]` → `[x]` as you go; this file doubles as your progress tracker for the judges.

---

## 0. Design review: what the Stitch design gives us

### 0.1 What is designed

| Screen | File | Status |
|---|---|---|
| S3 Today's menu (employee, mobile) | `s3_today_s_menu_employee_mobile` | ✅ Designed |
| S4 Checkout + slot selection (mobile) | `s4_checkout_slot_selection_mobile` | ✅ Designed |
| S5 Order pass / QR ticket (mobile) | `s5_order_pass_qr_ticket_fresh_counter` | ✅ Designed |
| S10 Manager dashboard (desktop) | `s10_manager_dashboard_desktop` | ✅ Designed |
| S1 Login, S2 Sign up, S6 My orders, S7 Staff queue, S8 Scan, S9 Prep list, S11 Menu catalogue, S12 Item form, S13 Daily menu editor, S14 Users, S15 Settings, S16 Exports, S17 403/404 | — | ❌ **Not designed.** Build these with the same Fresh Counter components (tasks FE-60 to FE-95) |

### 0.2 Design system to implement (from `DESIGN.md`)

| Token group | Values to carry into code |
|---|---|
| Fonts | **Plus Jakarta Sans** (all UI) · **JetBrains Mono** (prices, pickup codes, times, counts) |
| Icons | **Material Symbols Outlined** (as used in the Stitch HTML) |
| Source files | `docs/design/fresh_counter/DESIGN.md` · `docs/design/*/code.html` (Tailwind config + markup to port) · `docs/design/*/screen.png` |
| Canvas / cards | `surface-cream #FBF6EF` · `surface-card #FFFFFF` · `surface-card-warm #FFFDF9` |
| Borders | `border-sand #F3E8DC` · `border-sand-strong #EAD7C5` |
| Text | `text-primary #2B211B` · `text-secondary #6E5D53` |
| Primary | Terracotta `#C2410C` (hover `#EA580C`, active `#9A3412`) |
| Diet markers (FSSAI) | Veg `#15803D` dot-in-square · Non-veg `#7C2D12` triangle-in-square, 16×16, 2 px radius |
| Status | Warning `#FEF3C7` / `#FDE68A` / `#B45309` · Ready `#F0FDF4` / `#15803D` · Error `#BA1A1A` / `#FFDAD6` |
| Radius | buttons/inputs 8 px · cards 16 px · chips/badges full pill |
| Elevation | L1 card shadow `0 2px 4px rgba(43,33,27,.04)` · L3 tray/dialog `0 16px 24px -4px rgba(43,33,27,.12)` |
| Breakpoints | Mobile < 768 (4 col) · Tablet 768–1024 (8 col) · Desktop ≥ 1025 (12 col, max 1280) |
| Type scale | headline-xl 36/44 (28/36 mobile) · lg 24/32 · md 20/28 · sm 16/24 · body 16/14/12 · label 14/12 · ticket-code-lg 32/36 mono |

### 0.3 Design elements that go beyond our requirements: decisions

The AI design tool added some details that our requirements and data model don't support. These decisions are now **recorded in `02-requirements.md §6.1`** and reflected in the data model and API spec. Change a decision there first, then update the affected tasks.

| # | Element in design | Screen | Conflict | Decision | Task |
|---|---|---|---|---|---|
| D1 | "Building 4 · Floor…, Counter A", "Counter 2", "Counter C-04" | S3, S4, S5 | No pickup location in the model | **Keep, simplified:** one `pickupLocation` text in Settings (e.g. "Building 4 · Counter A"), shown everywhere | BE-21, FE-41 |
| D2 | Category labels MAINS / COMBO / LIGHT / DRINK on dish tiles | S3 | Enum is MAIN / SIDE / DESSERT / BEVERAGE | **Keep:** change the enum to `MAIN, COMBO, LIGHT, SIDE, DESSERT, BEVERAGE`; filter chips come from categories | BE-11, BE-30 |
| D3 | Filter chips with counts "All 6 · Veg 4 · Non-veg 2" | S3 | — | **Keep:** count on the client from the menu response | FE-41 |
| D4 | User avatar photos | S3–S5, S10 | No profile photos | **Simplify:** initials avatar (circle, terracotta) | FE-14 |
| D5 | "TechCorp ID #EMP-8921" | S4 | No employee ID field | **Keep, optional:** `employeeCode` (nullable) on User, set by the admin | BE-11, BE-26 |
| D6 | "Corporate Meal Subsidy ₹0 (Covered)", "Taxes & Platform Fees ₹0" | S4 | No subsidy or tax logic; no payments (W01) | **Drop** both rows; show Subtotal = Total and the line "Added to your monthly canteen statement" | FE-50 |
| D7 | "Order Verification · Step 2 of 2" + "12m window active" timer | S4 | No two-step flow | **Simplify:** keep the progress bar as "Step 2 of 2" (Menu → Checkout); the timer shows **time left until cut-off** | FE-50 |
| D8 | Full slot "Kitchen capacity reached" | S4 | Slot capacity is a **Should** (S03) | **Promote S03 to Must**, because the design depends on it (BE-46, US-19) | BE-46 |
| D9 | "Counter queue tokens expire 10 mins post-window" | S4 | Our no-show grace is 30 min | **Align:** text reads from the `noShowGraceMinutes` setting (default 30) | FE-50 |
| D10 | "Confirmed Dispatch Slot · Priority Ready · Counter C-04" | S4 | No priority or dispatch counters | **Simplify:** "Your pickup: Today · 13:00–13:15 · {pickupLocation}"; drop "Priority Ready" | FE-50 |
| D11 | "Save to Apple / Google Wallet" button | S5 | Needs signed wallet passes and a paid developer account | **Drop** (move to Could C07); keep "View today's full menu" | FE-55 |
| D12 | Decorative QR graphic; "Veg **Dum** Biryani" vs "Veg Biryani" | S5 | Mock artwork; inconsistent dish name | **Fix:** render the real QR from the API (O4); always use the dish name from the order snapshot | FE-55 |
| D13 | "In 18 mins", "Placed at 10:18 AM" | S5 | — | **Keep:** derived from `slotStart` and `createdAt` on the client | FE-55 |
| D14 | KPI extras: "+14% vs yesterday", "Avg ₹115/order", "75% collected", "Est. wait ~6m", "Refunded auto", "Counter 3 holding" | S10 | Not in the dashboard API | **Keep:** vs-yesterday %, average per order, collected % (cheap; add to R1). **Drop:** est. wait, "refunded" (no payments), counter holding | BE-60, FE-80 |
| D15 | "Pickup Slots · Capacity 30/slot · Peak interval detected · Stn 1 & 2 Boosted · No bottleneck alerts" | S10 | No stations | **Keep:** capacity line and peak highlight. **Drop:** stations and bottleneck alerts | FE-80 |
| D16 | "Quick Live Orders Feed" table with tabs, auto-refresh 5 s, actions "Mark Collected / Call Station / Notify / Void" | S10 | Collecting without the pickup code breaks BR8 (single-use code check) | **Keep** the feed and tabs (poll every 15 s). Actions: **Start / Ready / Mark No-show** only. "Mark Collected" opens the code-verify dialog | BE-61, FE-81 |
| D17 | "Desk 4B · Tech Eng" under employee name | S10 | No desk or department fields | **Keep, optional:** `department` (nullable) on User; drop desk | BE-11 |
| D18 | "LIVE SYNC", "Terminal Sync Online (100%)", "4 Active Terminals", "Open KDS →" | S10 | No terminals or KDS | **Simplify:** "Last updated 12:52 · auto-refresh" indicator; "Open KDS" links to the Prep list (S9) | FE-80 |
| D19 | Manager sidebar shows "Settings & Rules" | S10 | Settings are **Admin-only** (RBAC) | **Keep RBAC:** the manager sidebar shows Dashboard, Daily Menu, Menu Catalogue, Orders Queue & Prep, Exports. Admin gets Users + Settings | FE-16 |
| D20 | Sold-out button labelled "Unavailable" | S3 | — | **Keep** the label | FE-41 |
| D21 | Broken brand logo image in the header (alt text shows) | S3, S10 | Missing asset | **Fix:** simple text wordmark "CanteenQ" (or a small SVG logo) | FE-14 |

> **Data changes from these decisions:** User gains `employeeCode?`, `department?` · Category enum gains `COMBO`, `LIGHT` · Settings gains `pickupLocation`, `slotCapacity` (now required, default 30) · Dashboard API gains `vsYesterdayPct`, `avgOrderPaise`, `collectedPct`, `peakSlot`, `capacityPerSlot`.

---

## 1. Project setup (shared)

| ✓ | ID | Task | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | SET-01 | Create GitHub repo | `canteen-preorder`, share with organisers, add `docs/` (incl. `docs/design/`), protect `main` | Rules | — | P1 | 0.5 |
| [ ] | SET-02 | Monorepo skeleton | Root `package.json` with npm **workspaces** `shared`, `backend`, `frontend`; root scripts (`dev`, `build`, `lint`, `typecheck`, `test:*`); shared `tsconfig.base.json` (strict) | ADR-001 v2 | SET-01 | P1 | 0.75 |
| [ ] | SET-03 | Scaffold `frontend` | `npm create vite@latest web -- --template react-ts`; add Tailwind, React Router, TanStack Query, react-hook-form, `@hookform/resolvers`, `html5-qrcode`, Fontsource fonts | ADR-001 v2 | SET-02 | P1 | 0.75 |
| [ ] | SET-04 | Scaffold `backend` | Express + TypeScript (`tsx` for dev, `tsc` build), `prisma @prisma/client zod bcryptjs jose cookie-parser helmet cors express-rate-limit pino qrcode date-fns date-fns-tz`; `src/app.ts` (exports app) + `src/server.ts` (listen on `PORT`) | ADR-001 v2, 05 §2 | SET-02 | P1 | 1 |
| [ ] | SET-05 | Create `shared` | Zod schemas, TS types, constants (roles, statuses, categories, error codes); built with `tsc` and imported as `@canteenq/shared` by both apps | ADR-001 v2 | SET-02 | P1 | 0.75 |
| [ ] | SET-06 | Test tooling | Vitest in `backend` and `frontend`; `supertest` + `@types/supertest` in `backend`; Playwright at the root (`frontend/tests/e2e`) with `jsqr`; `npx playwright install` | 07 strategy | SET-03, SET-04 | P1 | 0.75 |
| [ ] | SET-07 | Environment config | `backend/.env.example`: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `ENABLE_TEST_CLOCK`, `RESEND_API_KEY`, `CRON_SECRET`, `WEB_ORIGIN`, `PORT`, `APP_ENV`; `frontend/.env.example`: `VITE_API_BASE=/api`; `src/env.ts` validates the API settings with Zod at start-up | 05 §6 | SET-04 | P1 | 0.5 |
| [ ] | SET-08 | Database | Neon project (free): main branch + dev branch; copy the pooled and direct URLs. Local option: `docker run postgres:16` | ADR-001 | SET-07 | P1 | 0.5 |
| [ ] | SET-09 | Dev proxy | `vite.config.ts` `server.proxy` (and `preview.proxy`): `/api` → `http://localhost:4000`, so the browser uses one origin locally too | 05 §1 | SET-03 | P1 | 0.25 |
| [ ] | SET-10 | Lint and format | ESLint + Prettier for all workspaces; `npm run lint`, `npm run typecheck`; optional lint-staged hook | 06 | SET-02 | P2 | 0.5 |
| [ ] | SET-11 | CI pipeline | `.github/workflows/ci.yml` from `06-build-plan.md §5` (Postgres service, shared build, migrate, seed, lint, unit, Supertest, build, Playwright) | 06 §5 | SET-06, BE-12 | P1 | 1.5 |
| [ ] | SET-12 | Deploy the API | Web service from `backend` (build: `npm ci && npm run build -w shared -w backend && npx prisma migrate deploy`; start: `node dist/server.js`); set environment variables; `/api/health` responds | 05 §6 | SET-08, BE-67 | P1 | 1 |
| [ ] | SET-13 | Deploy the web app | Hosting config with the **`/api/*` proxy rewrite** to the API URL and the SPA fallback; deploy previews on pull requests | 05 §6 | SET-12 | P1 | 0.75 |
| [ ] | SET-14 | **Verify cookies through the proxy** | On the live URL: sign up, reload, `/api/auth/me` returns the user; the cookie is first-party (`SameSite=Lax`, `Secure`); direct calls from another origin are blocked by CORS | ADR-001 §6 | SET-13, BE-26 | P1 | 0.5 |
| [ ] | SET-15 | Staging API for load tests | Second API deployment on the Neon **dev branch** with `ENABLE_TEST_CLOCK=true`, used by k6 (never production) | 07e | SET-12 | P2 | 0.5 |

## 2. Backend tasks

### 2.1 Database, schema and seed

| ✓ | ID | Task | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | BE-10 | Prisma init | `npx prisma init` in `backend`; datasource with `url` (pooled) and `directUrl` | 05b | SET-08 | P1 | 0.25 |
| [ ] | BE-11 | Write schema | Models from `05-data-model.md §3` **plus design changes:** User `employeeCode?`, `department?`; Category enum `MAIN, COMBO, LIGHT, SIDE, DESSERT, BEVERAGE`; Settings `pickupLocation` (default "Main canteen counter"), `slotCapacity Int @default(30)` | 05b, D2, D5, D17, D1, D8 | BE-10 | P1 | 1 |
| [ ] | BE-12 | First migration | `prisma migrate dev --name init` | — | BE-11 | P1 | 0.25 |
| [ ] | BE-13 | Raw SQL migration | Partial unique index (one active order per user per day), unique active menu-item name (case-insensitive), CHECK `orderedQty <= quantity`, CHECK `qty >= 1`, CHECK price range | 05b §2, BR2, BR4 | BE-12 | P1 | 0.5 |
| [ ] | BE-14 | Prisma client | `src/db.ts` exporting one `PrismaClient`; graceful disconnect on shutdown and after tests | — | BE-12 | P1 | 0.25 |
| [ ] | BE-15 | Seed script | `prisma/seed.ts`: 4 role users (with `employeeCode` and `department` for the demo), settings row, **6 dishes from the design** (Veg Biryani 120, Chicken Curry 150, Paneer Butter Masala 130, Dal Tadka + Rice 80, Curd Rice 60, Masala Chaas 25), today's and tomorrow's daily menu | 05b §5, design sample data | BE-13 | P1 | 1 |
| [ ] | BE-16 | Demo seed | `npm run db:seed:demo`: about 120 orders spread over the slots and statuses so S10 looks like the design (yesterday's orders too, for "vs yesterday") | 08 demo | BE-15, BE-41 | P2 | 1 |

### 2.2 Shared backend foundations

| ✓ | ID | Task | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | BE-17 | Error model | `AppError(code, status, message, fields?)` + Express `errorHandler` middleware (last in the chain) → standard error JSON; unknown error → `500 INTERNAL_ERROR` with no stack trace; `notFound` handler → 404 | 05c, US-15 | SET-04 | P1 | 0.75 |
| [ ] | BE-18 | Core middleware | `authenticate` (reads the cookie, loads the user), `requireRole(...roles)`, `validate(schema, 'body' \| 'query' \| 'params')`; `express.json` errors → `400 INVALID_JSON`; an `asyncHandler` wrapper so rejected promises reach the error handler | 05a §2 | BE-17, BE-23 | P1 | 1.5 |
| [ ] | BE-19 | Clock adapter + `testClock` middleware | `src/adapters/clock.ts`: `now(req)` in IST; the `testClock` middleware stores the `x-test-now` header on the request **only** when `ENABLE_TEST_CLOCK=true`; helpers `todayIST()`, `toISTDate()`, `combine(date, "HH:mm")` | A11, TC-U-04 | SET-04 | P1 | 1 |
| [ ] | BE-20 | Money helpers | In `shared`: `toPaise()`, `formatINR()` (₹ with Indian grouping, e.g. ₹13,800), integer-only maths, used by both apps | A12, TC-U-09 | SET-05 | P1 | 0.5 |
| [ ] | BE-21 | Settings service | `getSettings()` (cached per request), defaults; exposes `pickupLocation`, `slotCapacity`, `noShowGraceMinutes` | US-05, D1 | BE-14 | P1 | 0.5 |
| [ ] | BE-22 | Zod schemas | `shared/src/schemas/*`: auth, user, settings, menuItem, dailyMenu, order, verify, report query. **Imported by the API middleware and the web forms** | 05c rules, US-15 | SET-05 | P1 | 1.5 |

### 2.3 Authentication and access control

| ✓ | ID | Task | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | BE-23 | Session library | `src/auth/session.ts`: sign and verify a JWT (`jose`, HS256, 8 h), set and clear the httpOnly, Secure, SameSite=Lax cookie `cq_session` (`res.cookie` / `res.clearCookie`) | US-02 | SET-04 | P1 | 1 |
| [ ] | BE-24 | Password library | `hash()` with bcrypt cost 12, `verify()` | BR10, TC-U-08 | SET-04 | P1 | 0.25 |
| [ ] | BE-25 | Login lockout | 5 failed attempts in 15 min → `lockedUntil`; reset on success | BR11, TC-U-14 | BE-24 | P1 | 0.5 |
| [ ] | BE-26 | `POST /api/auth/signup` (A1) | Domain check against the settings, lower-case email, duplicate → 409, default role EMPLOYEE, sets the cookie | US-01 | BE-18, BE-22 | P1 | 1 |
| [ ] | BE-27 | `POST /api/auth/login` (A2) | Same 401 message for an unknown email and a wrong password; disabled → 403; locked → 429 | US-02 | BE-25 | P1 | 1 |
| [ ] | BE-28 | `POST /api/auth/logout` (A3), `GET /api/auth/me` (A4) | Logout clears the cookie; `/me` returns the user (name, role, `employeeCode`, `department`) | US-02 | BE-23 | P1 | 0.5 |
| [ ] | BE-29 | Role guard rules | `authenticate` loads the user from the DB on **every** request (role and active flag) → 401; `requireRole` → 403; order queries scoped by user so employees get 404 (not 403) for other users' orders | US-03, TC-API-RBAC-* | BE-18 | P1 | 1 |
| [ ] | BE-30 | Assemble `app.ts` | Order: `helmet` → `cors({ origin: WEB_ORIGIN, credentials: true })` → `express.json({ limit: '100kb' })` → `cookie-parser` → `testClock` → request logger (`pino-http`) → routers under `/api` → `notFound` → `errorHandler`; rate limit on `/api/auth/*`; `trust proxy` set (behind the hosting proxy) | 05a §2, NFR3 | BE-17..19 | P1 | 1 |

### 2.4 Users and settings (Admin)

| ✓ | ID | Task | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | BE-31 | `GET /api/users` (U1) | Search by name/email, filter by role, page size 20 | US-04 | BE-29 | P1 | 0.75 |
| [ ] | BE-32 | `PATCH /api/users/:id` (U2) | Role, `isActive`, `employeeCode`, `department`; last-admin protection → 409; audit log entry (S08) | US-04 | BE-31 | P1 | 1 |
| [ ] | BE-33 | `GET/PUT /api/settings` (S1, S2) | Validation: end > start, cut-off < slot start, slot minutes ∈ {10,15,20,30}, capacity 1–500, `pickupLocation` ≤ 80 chars | US-05 | BE-21 | P1 | 1 |
| [ ] | BE-34 | Closed dates (S3–S5) | List, add, delete holidays | S05 | BE-33 | P2 | 0.75 |

### 2.5 Menu

| ✓ | ID | Task | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | BE-35 | `GET/POST /api/menu-items` (M1, M2) | Manager only; duplicate active name → 409; price in paise | US-06 | BE-29 | P1 | 1 |
| [ ] | BE-36 | `PATCH /api/menu-items/:id` (M3) | Edit or archive (`isActive=false`) | US-06 | BE-35 | P1 | 0.5 |
| [ ] | BE-37 | `GET /api/daily-menu?date=` (M4) | Returns `orderingOpen`, `cutoff`, `closed`, `pickupLocation`, and items with `category`, `diet`, `pricePaise`, `quantity`, `remaining`; 422 when not published | US-08 | BE-19, BE-21 | P1 | 1 |
| [ ] | BE-38 | `PUT /api/daily-menu/:date` (M5) | Replace the menu for a date; reject past dates, duplicates, qty outside 1–1000; quantity below already ordered → 409; removing an item with orders → 409 | US-07 | BE-37 | P1 | 1.5 |
| [ ] | BE-39 | `GET /api/slots?date=` (M6) | Generates slots from the settings; each has `booked`, `capacity`, `available` | US-09, US-19 | BE-21 | P1 | 0.75 |

### 2.6 Orders (Employee)

| ✓ | ID | Task | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | BE-40 | Rules module | `src/services/rules.ts`: `isOrderingOpen`, `isValidOrderDate` (today or tomorrow), `generateSlots`, `isValidSlot`, `isClosedDay` (pure functions, unit-tested) | BR1, BR5, TC-U-01..06 | BE-19 | P1 | 1.5 |
| [ ] | BE-41 | Pickup code generator | 6 characters from `[A-HJ-NP-Z2-9]` using `crypto.randomInt`; retry on unique clash | BR8, TC-U-10 | — | P1 | 0.25 |
| [ ] | BE-42 | **Place order service** | One transaction: validate date, cut-off, closed day and slot → check slot capacity → **conditional UPDATE of stock per item** (0 rows → `OUT_OF_STOCK`) → insert the order and items with name and price snapshot → commit. Map the partial-index clash to `ORDER_EXISTS_FOR_DATE` | BR1–BR6, US-09, 05a §5 | BE-40, BE-41 | P1 | 3 |
| [ ] | BE-43 | `POST /api/orders` (O1) | Wrap BE-42; **Idempotency-Key** support (same key → 200 with the same order) | US-09 AC9 | BE-42 | P1 | 1 |
| [ ] | BE-44 | `POST /api/orders/:id/cancel` (O5) | Owner only, before the cut-off, PLACED only; returns stock in the same transaction | US-10 | BE-42 | P1 | 1 |
| [ ] | BE-45 | `GET /api/orders/me` (O2), `GET /api/orders/:id` (O3) | Newest first, 10 per page; the response includes `createdAt`, `slotStart`, `slotEnd`, `pickupLocation` (for S5 "In 18 mins" and "Placed at"). Register `/me` **before** `/:id` in the router | US-11, D13 | BE-29 | P1 | 1 |
| [ ] | BE-46 | Slot capacity (now Must) | Count active orders per slot inside the transaction (`SELECT … FOR UPDATE` on a slot counter row, or a count check with retry) → `409 SLOT_FULL` | US-19, D8 | BE-42 | P1 | 1.5 |
| [ ] | BE-47 | `GET /api/orders/:id/qr` (O4) | PNG made with `qrcode`; content = pickup code only; `Cache-Control: private` | US-11 AC4, D12 | BE-45 | P1 | 0.5 |

### 2.7 Staff operations

| ✓ | ID | Task | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | BE-48 | Status machine | `orderStatus.ts`: allowed transitions table + `assertTransition()` | BR7, TC-U-07 | — | P1 | 0.5 |
| [ ] | BE-49 | `GET /api/orders?date&slot&status` (Q1) | Grouped by slot, counts per status, employee name and department; filter tabs as in the design: All / Ready / Preparing / Collected / Issues (NO_SHOW + CANCELLED) | US-12, D16 | BE-29 | P1 | 1.5 |
| [ ] | BE-50 | `PATCH /api/orders/:id/status` (Q2) | PREPARING / READY / NO_SHOW only; sets `readyAt`; audit log | US-12 | BE-48 | P1 | 0.75 |
| [ ] | BE-51 | `POST /api/orders/verify` (Q3) | Case-insensitive code; checks for wrong date, cancelled and already collected; returns `warning: NOT_READY` | US-13 | BE-48 | P1 | 1 |
| [ ] | BE-52 | `POST /api/orders/:id/collect` (Q4) | Sets COLLECTED, `collectedAt`, `collectedById`; single use | US-13 | BE-51 | P1 | 0.5 |
| [ ] | BE-53 | `GET /api/reports/prep-list` (R2) | Quantity per dish, excluding cancelled orders | US-12 AC6 | BE-49 | P1 | 0.5 |

### 2.8 Reports, notifications, jobs

| ✓ | ID | Task | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | BE-60 | `GET /api/reports/dashboard` (R1), extended for the design | KPIs: orders, revenue, collected (+ `collectedPct`), pending, cancelled, no-show, **`avgOrderPaise`**, **`vsYesterdayPct`** (orders compared with the previous working day); items: ordered/limit/remaining/soldOut; slots: count, `capacityPerSlot`, **`peakSlot`** | US-14, D14, D15 | BE-49 | P1 | 2 |
| [ ] | BE-61 | Live orders feed | Reuse Q1 with `?limit=5&sort=recent` for the dashboard table; the response includes `lastUpdated` | D16 | BE-49 | P2 | 0.5 |
| [ ] | BE-62 | CSV adapter | `toCSV(rows)` with quoting + **formula-injection escaping** | US-17 AC3, TC-U-13 | — | P2 | 0.5 |
| [ ] | BE-63 | `GET /api/reports/orders.csv` (R3) + `statement.csv` (R4) | Range ≤ 92 days; `Content-Disposition` filename; statement includes `employeeCode` | US-17 | BE-62 | P2 | 1 |
| [ ] | BE-64 | Email adapter (planned: Resend; built: SMTP via nodemailer, Brevo live) | `sendOrderConfirmed`, `sendOrderReady`; errors are logged and never thrown; no-op when there's no API key | US-18 | — | P2 | 1 |
| [ ] | BE-65 | Hook emails | Confirmation after BE-43; "ready" after the READY change in BE-50 | US-18 | BE-64 | P2 | 0.5 |
| [ ] | BE-66 | Auto no-show job | `POST /api/cron/no-show` with the Bearer `CRON_SECRET` (constant-time compare); marks PLACED, PREPARING and READY orders as NO_SHOW after slot end + grace; **GitHub Actions schedule** `.github/workflows/no-show-cron.yml` (see `06-build-plan.md §6`) | US-20 | BE-48 | P2 | 1 |
| [ ] | BE-67 | Health endpoint (X1) | DB ping; 503 when the DB is down; used by the host's health check and as the warm-up URL | NFR7 | BE-14 | P1 | 0.25 |

### 2.9 Backend hardening

| ✓ | ID | Task | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | BE-70 | Security headers | API: `helmet` defaults. Web: hosting headers file with CSP (self + Google Fonts for Material Symbols), `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy: camera=(self)` | NFR3 | SET-13 | P2 | 0.75 |
| [ ] | BE-71 | Logging | `pino` + `pino-http` (JSON lines): request ID, route, user ID, status, error code; redact `password`, `cookie` and `authorization` | NFR3 | BE-30 | P2 | 0.5 |
| [ ] | BE-72 | Production test-clock guard | Fail start-up if `ENABLE_TEST_CLOCK=true` and `APP_ENV=production` | TC-API-SYS-02 | BE-19 | P1 | 0.25 |
| [ ] | BE-73 | Query indexes | Confirm the `(orderDate, slotStart, status)` index; `EXPLAIN` the queue and dashboard queries | NFR1 | BE-60 | P2 | 0.5 |
| [ ] | BE-74 | Graceful start and stop | Fast start (no heavy work at boot) so cold starts are quick; on `SIGTERM` close the server and the Prisma connection | NFR7 | BE-30 | P2 | 0.5 |

---

## 3. Frontend tasks

### 3.1 Design system foundation (from Fresh Counter `DESIGN.md`)

| ✓ | ID | Task | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | FE-01 | Theme tokens | Port the Stitch `tailwind.config` colours, radius, spacing and font sizes into `frontend` Tailwind (`@theme` in `src/styles/index.css` for Tailwind v4, or `tailwind.config.ts` for v3). Use the token names from DESIGN.md (`surface-cream`, `border-sand`, `text-secondary`, `primary`, `fssai-veg`…) | §0.2 | SET-02 | P1 | 1.5 |
| [ ] | FE-02 | Fonts | `@fontsource/plus-jakarta-sans` (400–700) as `--font-sans`, `@fontsource/jetbrains-mono` (500–700) as `--font-mono`, imported in `main.tsx` (self-hosted, no Google request) | §0.2 | FE-01 | P1 | 0.25 |
| [ ] | FE-03 | Icons | Material Symbols Outlined (Google Fonts `<link>` or the `material-symbols` npm package) + an `<Icon name="…" />` wrapper with `aria-hidden`; icon-only buttons require `aria-label` | §0.2 | FE-01 | P1 | 0.5 |
| [ ] | FE-04 | Elevation and utility classes | `shadow-l1`, `shadow-l2`, `shadow-l3`; `tabular-nums` and mono for money and codes | DESIGN.md elevation | FE-01 | P1 | 0.25 |
| [ ] | FE-05 | Formatting helpers | `formatINR` from `shared`; `formatTime("13:00")`, `relativeMins("In 18 mins")`, `formatDate("Tue 17 Nov")` in IST | D13 | BE-20 | P1 | 0.5 |
| [ ] | FE-06 | API client | `src/api/client.ts`: typed `fetch` wrapper on `VITE_API_BASE` (`/api`, same origin, `credentials: 'same-origin'`); JSON errors → `ApiError(code, fields)`; 401 → `/login?expired=1`; adds `Idempotency-Key` on order POST; **if a request takes over 1 s, show a loader (top progress bar and spinner)** | US-15, NFR7 | BE-17 | P1 | 1.25 |
| [ ] | FE-07 | Query and auth setup | `QueryClientProvider` (sensible `staleTime`, retry once, no retry on 4xx); `useMe()` hook; `AuthProvider` exposing the user and role | — | FE-06 | P1 | 0.75 |

### 3.2 Shared UI components (`components/ui`)

| ✓ | ID | Component | Variants / states (from the design) | Depends | Pri | Est |
|---|---|---|---|---|---|---|
| [ ] | FE-10 | `Button` | primary (terracotta, hover `#EA580C`, active `#9A3412`), secondary (white + sand border), ghost, danger; 44 px min height; loading spinner; disabled | FE-01 | P1 | 1 |
| [ ] | FE-11 | `Input`, `Select`, `Textarea`, `DateInput`, `TimeInput`, `Checkbox`, `Switch` | 44 px, 8 px radius, border-sand-strong, focus 1.5 px terracotta + 3 px sand ring, error message below, label always visible | FE-01 | P1 | 2 |
| [ ] | FE-12 | `DietMarker` | Veg dot-in-square / Non-veg triangle-in-square, 16×16 (FSSAI), `aria-label` | FE-01 | P1 | 0.5 |
| [ ] | FE-13 | `Badge` / `Pill` | Status (PLACED, PREPARING amber, READY green, COLLECTED, CANCELLED, NO_SHOW red), scarcity "Only 3 left" (amber), "Sold out", count pill | FE-01 | P1 | 0.75 |
| [ ] | FE-14 | `Avatar` + `Wordmark` | Initials avatar (D4); "CanteenQ" text logo (D21) | FE-01 | P1 | 0.5 |
| [ ] | FE-15 | `QtyStepper` | Pill `#F3E8DC`, mono number, terracotta + and −; min 0, max `maxQtyPerItem`; disabled ends | FE-01 | P1 | 0.75 |
| [ ] | FE-16 | `Card`, `SectionCard`, `Ticket` | Card 16 px radius, L1 shadow; Ticket = warm `#FFFDF9`, 1.5 px sand-strong border, dashed separator (S5) | FE-04 | P1 | 0.75 |
| [ ] | FE-17 | `Chip` / `FilterChips` | Default white + sand border; selected terracotta; optional count | FE-01 | P1 | 0.5 |
| [ ] | FE-18 | `SegmentedTabs` | Today / Tomorrow style from S3 (icon + label, terracotta active) | FE-01 | P1 | 0.5 |
| [ ] | FE-19 | `ProgressBar`, `StatusStepper` | Stock bars (S10); 4-step tracker Placed → Preparing → Ready → Collected (S5) | FE-01 | P1 | 1 |
| [ ] | FE-20 | `KpiTile` | Label, icon, big mono number, sub-text, optional mini bar / pill (S10) | FE-04 | P1 | 0.5 |
| [ ] | FE-21 | `DataTable` | Header, rows, empty state, loading skeleton, horizontal scroll on mobile | FE-01 | P1 | 1 |
| [ ] | FE-22 | `Dialog`, `BottomSheet`, `Toast`, `Alert` | Focus trap, Esc to close; toast success/warn/error; alert banner (amber note in S5) | FE-04 | P1 | 1.5 |
| [ ] | FE-23 | `EmptyState`, `Skeleton`, `ErrorState` | Used by every list/page | FE-01 | P1 | 0.5 |
| [ ] | FE-24 | `FormField` + Zod integration | `react-hook-form` + `@hookform/resolvers/zod` using the shared schemas (BE-22); server `fields` errors are shown on the matching inputs | BE-22, FE-11 | P1 | 1 |

### 3.3 Layouts and navigation

| ✓ | ID | Task | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | FE-25 | App and router | `main.tsx` + `App.tsx`: `createBrowserRouter` with the route table from `05-architecture.md §3a`, lazy-loaded route modules, `surface-cream` background, `<Toaster/>`, page titles per route | 05 §3a | FE-02, FE-07 | P1 | 0.75 |
| [ ] | FE-26 | Employee mobile shell (layout route) | Header (wordmark, pickup location line, avatar) + **bottom nav** Menu / My Orders (dot when there's an active order) / Profile, as in S3 | S3, US-16 | FE-14 | P1 | 1 |
| [ ] | FE-27 | Console shell (layout route) for Manager/Admin | **Left sidebar** as in S10 (wordmark + role label, "Lunch service: Active / Closed" pill, nav items, footer "Last updated"); top bar with date + Export + user. Sidebar collapses to a top menu under 1024 px | S10, D18, D19 | FE-14 | P1 | 1.5 |
| [ ] | FE-28 | `RequireRole` guard + role nav | `<RequireRole roles={[...]}>` layout route: not logged in → `/login`, wrong role → `/403`, logged in on `/login` → role home. Nav items — Manager: Dashboard, Daily Menu Editor, Menu Catalogue, Orders Queue & Prep, Exports. Admin: Dashboard (read-only), Users, Settings & Rules, Exports. Staff: Queue, Scan, Prep list | US-03, D19 | FE-27 | P1 | 0.5 |
| [ ] | FE-29 | Staff shell (layout route) | Simple top bar: wordmark, "Counter · {pickupLocation}", big **Scan / Enter code** button | S7/S8 | FE-14 | P1 | 0.5 |

### 3.4 Auth screens (not designed: build in Fresh Counter style)

| ✓ | ID | Screen | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | FE-30 | S1 Login `/login` | Centred card on cream; email, password with show/hide; messages for invalid, locked, disabled, expired (`?expired=1`); role-based redirect | US-02 | FE-24, BE-27 | P1 | 1.5 |
| [ ] | FE-31 | S2 Sign-up `/signup` | Name, company email, password + rules hint, confirm; inline Zod errors before submitting; success → `/menu` | US-01 | FE-24, BE-26 | P1 | 1.5 |
| [ ] | FE-32 | Logout | Profile menu item → A3 → `queryClient.clear()` → `/login` (replace history); Back shows the login page, not cached data | US-02 AC5 | BE-28 | P1 | 0.5 |
| [ ] | FE-33 | Profile `/profile` | Name, email, employee code, department, logout | — | FE-26 | P2 | 0.5 |

### 3.5 Employee screens (designed: match Stitch S3, S4, S5)

| ✓ | ID | Screen / part | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | FE-40 | S3 data hook | `useDailyMenu(date)` + `useSettings()`; auto-refresh remaining stock every 30 s | US-08 | FE-06, BE-37 | P1 | 0.5 |
| [ ] | FE-41 | **S3 Today's menu** `/menu` | Match the Stitch layout: Today/Tomorrow tabs, **cut-off card** ("Order before 11:00", "42 min left" mono pill, pickup window, location), filter chips with counts (All / Veg / Non-veg / categories), **dish cards** (initials tile coloured by category with a category label, diet marker, name, description, mono price, stock line, Add → stepper), scarcity pill, **sold-out card** (faded, "Sold out" pill, "Unavailable" button) | S3, US-08, D1–D3, D20 | FE-12–18, FE-40 | P1 | 4 |
| [ ] | FE-42 | S3 cart state | Cart in React context + `sessionStorage`; max per item; cleared on order or day change; **floating cart tray** "1 item · ₹120 · Veg Biryani · Checkout →" | S3, US-09 | FE-41 | P1 | 1.5 |
| [ ] | FE-43 | S3 edge states | After cut-off banner + switch to Tomorrow; menu not published; canteen closed; "You already have an order today → View"; loading skeleton cards; error retry | US-08 AC3–5, US-09 AC6 | FE-41 | P1 | 1.5 |
| [ ] | FE-44 | S3 countdown | Ticks every 30 s from the **server** time offset (not trusting the device clock); turns red under 10 min | BR1 | FE-41 | P1 | 0.75 |
| [ ] | FE-50 | **S4 Checkout** `/menu/checkout` | Match Stitch: back header, "Step 2 of 2" progress, **Order summary card** (items, qty, price, "1 item" pill), statement note with `employeeCode` (D5), Subtotal/Total only (D6), **slot grid** 2 columns (time range in mono, "Available", selected = terracotta + check, **Full** = struck through + "Kitchen capacity reached"), IST label, arrival note using the grace minutes (D9), "Your pickup" summary card (D10), sticky **Place order · ₹120 · Slot 13:00** button | S4, US-09, US-19 | FE-42, BE-39 | P1 | 4 |
| [ ] | FE-51 | S4 submit logic | Disable while sending; Idempotency-Key per checkout; handle `CUTOFF_PASSED`, `OUT_OF_STOCK` (show which item + "Reduce quantity"), `SLOT_FULL` (refresh slots), `ORDER_EXISTS_FOR_DATE`; success → `/orders/{id}?new=1` | US-09 AC2–9 | FE-50, BE-43 | P1 | 1.5 |
| [ ] | FE-55 | **S5 Order pass** `/orders/:id` | Match Stitch: success icon + "Order Confirmed" (when `new=1`), date + order number, **StatusStepper**, "Your lunch is ready!" green alert when READY (with location), **Assigned window** card with "In 18 mins" pill, **real QR** image (O4) in a white rounded box, "Backup manual code" mono code box with a copy button, "Verified for {name} ({email})", order summary (snapshot names, "Placed at 10:18 AM", "Billed to monthly statement", total), cut-off note or **Cancel order** button (before the cut-off), "View today's full menu". **No wallet button** (D11) | S5, US-10, US-11, D11–D13 | FE-16, FE-19, BE-45, BE-47 | P1 | 4 |
| [ ] | FE-56 | S5 live status | Poll O3 every 20 s while not final; a gentle highlight animation on the change to READY (respects reduced motion) | US-11 AC2 | FE-55 | P1 | 0.5 |
| [ ] | FE-57 | Cancel dialog | Confirm dialog → O5 → toast "Order cancelled" → back to Menu | US-10 | FE-22, BE-44 | P1 | 0.75 |
| [ ] | FE-58 | S6 My orders `/orders` | Today's active order card at the top (link to S5), history list (date, items, total, status badge), Load more, empty state | US-11 AC3/5 | FE-21, BE-45 | P2 | 1.5 |

### 3.6 Staff screens (not designed: Fresh Counter, counter-friendly)

| ✓ | ID | Screen | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | FE-60 | S7 Order queue `/staff/queue` | Status tabs with counts; orders grouped by slot (current slot highlighted, like the "Busiest peak" style in S10); order ticket cards: code (mono), name, items with diet markers, badge, one action button (**Start** / **Ready**); cancelled greyed; 2 columns on tablet; poll every 15 s | US-12 | FE-29, BE-49, BE-50 | P1 | 3 |
| [ ] | FE-61 | S8 Scan `/staff/scan` | `html5-qrcode` camera view with corner guides; manual 6-character code input (mono, upper-case); **result Ticket** (code, status, name, department, slot, items) + **HAND OVER** button (56 px); warning "Not marked ready yet"; big red errors (already collected / wrong date / cancelled / not found); success tick then reset after 3 s | US-13 | FE-16, BE-51, BE-52 | P1 | 3.5 |
| [ ] | FE-62 | Camera fallback | No camera or permission denied → hide the viewfinder, focus the code input, show a hint | US-13 AC3, A9 | FE-61 | P1 | 0.5 |
| [ ] | FE-63 | S9 Prep list `/staff/prep` | Big tiles: dish + mono number (≥ 36 px) + "of N portions"; sold-out tiles highlighted; print stylesheet | US-12 AC6 | BE-53 | P2 | 1 |

### 3.7 Manager screens (S10 designed, others not)

| ✓ | ID | Screen / part | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | FE-80 | **S10 Dashboard** `/manager/dashboard` | Match Stitch: header card "Canteen Overview & Operations" + date picker + **View Prep List** + **Export CSV**; **6 KPI tiles** (Total orders + vs-yesterday trend, Revenue + avg/order, Collected + % + bar, Pending/In-queue, Cancelled + %, No-show); **Items to Prepare & Stock Progress** (diet marker, name, "Portion limit", ordered/limit, Sold out / N left pill, bar); **Pickup Slots** horizontal bars with the peak row highlighted "BUSIEST PEAK", capacity footer; "Last updated" indicator. Drop the stations, terminals, KDS, refunded and est.-wait items (D14, D15, D18) | S10, US-14 | FE-20, FE-19, FE-27, BE-60 | P1 | 5 |
| [ ] | FE-81 | S10 Live orders feed | Table: Ticket ID (mono), employee + department, items with diet markers, slot pill, status badge, action (**Start / Ready / Verify code / Mark no-show**, D16); tabs All / Ready / Preparing / Collected / Issues with counts; "Showing 5 of 120 · View full queue →" | S10, D16 | FE-21, BE-61, BE-50 | P2 | 2.5 |
| [ ] | FE-82 | S10 empty / date states | 0 tiles, "No orders for this date", past date = read-only, Admin = read-only | US-14 AC4/6/7 | FE-80 | P1 | 0.75 |
| [ ] | FE-83 | S11 Menu catalogue `/manager/menu-items` | Table: initials tile, name, category, diet, price (mono), status, Edit; search; category filter; "Show archived"; **Add item** | US-06 | FE-21, BE-35 | P1 | 2 |
| [ ] | FE-84 | S12 Item form (dialog or page) | Name, description, category (new enum), diet, price ₹, active; Zod errors; duplicate-name error; archive action | US-06 | FE-24, BE-36 | P1 | 1.5 |
| [ ] | FE-85 | S13 Daily menu editor `/manager/daily-menu` | Date picker (today/future); list of active dishes with an "On menu" switch + quantity input; "Already ordered: 25" shown and enforced; Copy from yesterday (P3); Save → toast; past date read-only | US-07 | FE-24, BE-38 | P1 | 3 |
| [ ] | FE-86 | S16 Exports `/manager/exports` | Two cards: Orders (date range) and Monthly statement (month) → download CSV; range error | US-17 | BE-63 | P2 | 1 |

### 3.8 Admin screens (not designed)

| ✓ | ID | Screen | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | FE-90 | S14 Users `/admin/users` | Table: avatar, name, email, employee code, department, role dropdown, active switch, joined; search; role filter; pagination; confirm dialog for role or status change; last-admin error | US-04 | FE-21, FE-22, BE-31, BE-32 | P1 | 2.5 |
| [ ] | FE-91 | S15 Settings `/admin/settings` | Sections: Ordering (cut-off, max qty), Pickup (window start/end, slot length, **slot capacity**, **pickup location**, no-show grace), Access (allowed domains), Calendar (closed weekdays, holidays list); cross-field errors; "Changes apply to new orders only" | US-05, D1, D8 | FE-24, BE-33, BE-34 | P1 | 2.5 |

### 3.9 Common pages and polish

| ✓ | ID | Task | Details / done when | Ref | Depends | Pri | Est |
|---|---|---|---|---|---|---|---|
| [ ] | FE-93 | S17 Not authorised / 404 / error pages | React Router `errorElement`, catch-all `*` route, `/403`; friendly copy + "Go to my home" | US-03 AC2 | FE-23 | P1 | 0.75 |
| [ ] | FE-94 | Responsive pass | Check every screen at 360, 390, 768, 1024, 1280: no horizontal scroll; tap targets ≥ 44 px; tables scroll in a box | US-16, NFR6 | all FE | P1 | 2 |
| [ ] | FE-95 | Accessibility pass | Labels, focus rings, contrast (watch faded sold-out text and the amber pill), `aria-live` for toasts and the scan result, keyboard flow through checkout | NFR5 | all FE | P1 | 1.5 |
| [ ] | FE-96 | `data-testid` hooks | Stable test IDs on key elements (dish card, stepper, slot, place order, pickup code, hand-over, KPI tiles) for Playwright | 07 | all FE | P1 | 0.75 |
| [ ] | FE-97 | Loading performance | Lazy routes with `Suspense` skeletons; check the Vite bundle size; Lighthouse on `/menu` and `/orders/:id` | NFR5 | all FE | P3 | 1 |
| [ ] | FE-98 | Email templates | Simple HTML emails in Fresh Counter colours: Order confirmed (code in mono), Order ready | US-18 | BE-64 | P3 | 1 |

---

## 4. Testing tasks

| ✓ | ID | Task | Covers | Depends | Pri | Est |
|---|---|---|---|---|---|---|
| [ ] | QA-01 | Unit tests (Vitest, `backend` + `shared`): rules, clock, money, status machine, schemas, CSV, password, lockout, pickup code; plus web helpers and cart logic | TC-U-01..15 | BE-19..25, BE-40, BE-41, BE-48, BE-62 | P1 | 4 |
| [ ] | QA-02 | Supertest helpers: `agentFor(role)` (`request.agent(app)` logged in), `loginAsNewEmployee()`, `seedDailyItem()`, `atTime()` (sets `x-test-now`), DB reset in Vitest `globalSetup`; run API test files serially against the test DB | — | BE-15 | P1 | 1.5 |
| [ ] | QA-03 | Supertest: auth + RBAC matrix (data-driven with `it.each`) | TC-API-AUTH-*, TC-API-RBAC-* | QA-02, BE-26..30 | P1 | 3 |
| [ ] | QA-04 | Supertest: users, settings, menu, daily menu | TC-API-USR-*, SET-*, MENU-* | QA-02 | P1 | 2.5 |
| [ ] | QA-05 | Supertest: orders incl. **concurrency** (10 parallel agents), idempotency, cancel/re-order, QR decode, slot full | TC-API-ORD-01..16 | QA-02, BE-42..47 | P1 | 3.5 |
| [ ] | QA-06 | Supertest: staff, reports, validation, system (test-clock disabled when `APP_ENV=production`) | TC-API-STF-*, RPT-*, VAL-*, SYS-* | QA-02 | P1 | 3 |
| [ ] | QA-07 | Tests for the **new design fields**: `vsYesterdayPct`, `avgOrderPaise`, `peakSlot`, `pickupLocation`, new categories, `employeeCode` in the CSV | TC-API-RPT-05, TC-API-SET-04, TC-API-MENU-01 | BE-60 | P1 | 1 |
| [ ] | QA-08 | Playwright config: projects `chromium-desktop` + `mobile` (Pixel 5 / iPhone 13); **two `webServer` entries** (API on :4000, `vite preview` on :4173 with the `/api` proxy); HTML report | — | SET-04 | P1 | 0.5 |
| [ ] | QA-09 | UI tests: golden path, sold out/stepper, after cut-off, cancel, scan errors, XSS, mobile layout, dashboard, CSV, cancelled-in-queue | TC-UI-01..15 | QA-08, FE-* | P1 | 5 |
| [ ] | QA-10 | **Visual check against Stitch**: screenshot S3, S4, S5, S10 at the design sizes and compare side by side with the `screen.png` files; log differences | TC-UI-16 | FE-41, FE-50, FE-55, FE-80 | P2 | 1 |
| [ ] | QA-11 | k6 load test (against the staging deployment, after warm-up) + oversell SQL checks; fill in the results table | TC-NFR-01/02 | SET-15, BE-43 | P1 | 2 |
| [ ] | QA-12 | Manual: real-phone camera scan, tablet layout, emails, 2 exploratory charters | TC-M-01..05 | all | P1 | 2 |
| [ ] | QA-13 | Optional: Lighthouse accessibility + OWASP ZAP baseline | TC-NFR-03/04 | SET-13 | P3 | 1 |
| [ ] | QA-14 | Re-run `scripts/trace-matrix.py`; update the traceability matrix status; fill in the bug log | 07c, 07d | all QA | P1 | 1 |

---

## 5. Documentation and demo tasks

| ✓ | ID | Task | Pri | Est |
|---|---|---|---|---|
| [x] | DOC-01 | Add the Stitch export to `docs/design/` (screens + `DESIGN.md`); link it from `05-wireframes.md` as the high-fidelity design | P1 | 0.5 |
| [x] | DOC-02 | Record decisions D1–D21 in `02-requirements.md` change log; promote S03 (slot capacity) to Must; add Could **C07 Wallet pass** | P1 | 0.5 |
| [x] | DOC-03 | Update `05-data-model.md` (new fields and enum), `05-api-spec.md` (M4 `pickupLocation`, R1 new KPIs), `03-user-stories.md` (US-19 → Must); ADR-001 v2 and architecture for Option B | P1 | 1 |
| [ ] | DOC-04 | Prompt journal: Stitch design entry and AI design mistakes M-01..M-03 are drafted; **review them, fill in the dates, and add the code-level mistakes as you find them** | P1 | 0.5 |
| [ ] | DOC-05 | Keep the traceability matrix, bug log and test results updated daily | P1 | 1 |
| [ ] | DOC-06 | README in the repo root: what it is, live URL, demo accounts, how to run both apps (`npm run dev` starts web + API), test commands, the slow-request loader note | P1 | 0.5 |
| [ ] | DOC-07 | Demo rehearsal (time it), backup video of the golden path, retrospective | P1 | 2 |

---

## 6. Suggested build order (one week)

| Day | Backend | Frontend | Test / docs |
|---|---|---|---|
| **1** | SET-01..14 (monorepo, both apps, deploy, cookie check), BE-10..22 | FE-01..07 (tokens, fonts, icons, API client, query setup) | DOC-01..03 ✅ done |
| **2** | BE-23..34 (auth, middleware, `app.ts`, users, settings) | FE-10..24 (component kit), FE-25..29 (router, shells, guards), FE-30..32 (login/sign-up) | QA-01 (unit), QA-02..03 |
| **3** | BE-35..47 (menu, slots, **place order**, cancel, QR) | **FE-40..44 (S3 Menu)**, **FE-50..51 (S4 Checkout)** | QA-04..05 |
| **4** | BE-48..53 (staff), BE-60 (dashboard) | **FE-55..57 (S5 Pass)**, FE-60..62 (queue, scan), **FE-80, FE-82 (S10)** | QA-06..07 |
| **5** | BE-61..67 (feed, CSV, email, cron, health) | FE-83..86 (catalogue, item form, daily menu, exports), FE-90..91 (users, settings), FE-58, FE-63, FE-81 | QA-08..10 |
| **6** | BE-70..74 (hardening), SET-15 (staging API) | FE-93..96 (error pages, responsive, a11y, test IDs) | QA-09 (finish), QA-11 (k6), QA-12 (manual), bug fixing |
| **7** | Bug fixes only | Bug fixes only | QA-14, DOC-04..07, final deploy, demo |

**If time runs short, drop in this order:** FE-98 → FE-97 → BE-66 (auto no-show) → BE-64/65 (email) → FE-81 (live feed) → FE-58 (history) → FE-63 (prep tiles; keep the API) → BE-34 (holidays). Never drop P1 tests.

---

## 7. Totals

| Area | Tasks | Approx. hours |
|---|---|---|
| Setup | 15 | 10.5 |
| Backend | 57 | 48.25 |
| Frontend | 61 | 82.25 |
| Testing | 14 | 31 |
| Docs and demo | 7 (3 already done) | 6 |
| **Total** | **154** | **≈ 180 h** |

> ⚠️ **Reality check:** about 180 hours of work is more than one person can do in a single week, even with AI help. Option B adds about 8 hours compared with the single-app plan (monorepo, two deployments, proxy and cookie check). Two things make it doable: (1) AI-assisted coding usually speeds up the UI component and CRUD tasks a lot, and (2) the drop order in §6. Plan to finish **all P1 tasks first** (roughly 160 h before AI speed-up). Treat P2 and P3 as stretch goals, and say so honestly in the retrospective.
