# Stage 7b — Test Cases

**Legend:** Level U = Unit (Vitest) · A = API (Supertest + Vitest) · UI = Playwright E2E · M = Manual · N = Non-functional
**Priority:** P1 = must pass for release · P2 = important · P3 = nice to have
**Status** is tracked in the [traceability matrix](07-traceability-matrix.md).

Common preconditions: seed data loaded; cut-off 11:00; slots 12:30–14:30 every 15 min; max qty 5; domains `rubicotech.com` and `rubicotech.in`; test date **2026-11-17 (Tue)**; `x-test-now` used to control time.

---

## 1. Unit tests (`backend/tests/unit`, Vitest)

| ID | Title | Story / Rule | Pri | Input | Expected |
|---|---|---|---|---|---|
| TC-U-01 | Ordering open before cut-off | US-09 AC1 · BR1 | P1 | date 17 Nov, now 10:59:59 IST | `true` |
| TC-U-02 | Ordering closed exactly at cut-off | US-09 AC2/AC3 · BR1 | P1 | now 11:00:00 IST | `false` |
| TC-U-03 | Order date window: today and tomorrow only | US-09 AC10 | P1 | now 16 Nov 23:00 IST; dates 16, 17, 18 Nov, and 15 Nov | 16 → closed (past cut-off), 17 → open, 18 → rejected (day after tomorrow), 15 → rejected |
| TC-U-04 | IST/UTC boundary | A11 · BR1 | P1 | `2026-11-17T05:29:59Z` and `05:30:00Z`; `2026-11-16T18:31:00Z` | open / closed; "today" = 17 Nov (IST) |
| TC-U-05 | Slot generation | US-09 | P2 | 12:30–14:30, 15 min | 8 slots; first 12:30–12:45; last 14:15–14:30 |
| TC-U-06 | Slot validation | US-09 AC8 | P1 | `12:10`, `14:30`, `12:15`, `13:00` | false, false, false, true |
| TC-U-07 | Order status transition table | BR7 · US-12 AC4 | P1 | All 6×6 status pairs | Only the transitions in the state machine are allowed; all others are rejected |
| TC-U-08 | Password hashing | US-01 AC6 · BR10 | P1 | `Lunch2026` | Hash ≠ input, starts with `$2b$12$`, verify(correct) = true, verify(wrong) = false |
| TC-U-09 | Money in paise | A12 | P2 | 3 × 3333 paise; `formatINR(9999)`; `toPaise("120.50")` | 9999; `₹99.99`; 12050; `toPaise("10.999")` throws |
| TC-U-10 | Pickup code generator | BR8 | P2 | Generate 5,000 codes | All 6 chars from `[A-HJ-NP-Z2-9]`; generated with `crypto.randomInt` |
| TC-U-11 | Order schema validation | US-09 AC7 · US-15 | P1 | qty 0, 6, 2.5, "a"; empty items; duplicate item IDs | Each case is rejected with a field-specific message |
| TC-U-12 | Sign-up schema | US-01 AC2/4/5 | P1 | `priya@gmail.com`; `abc`; `  Priya@Rubicotech.COM ` | Domain error; password error; normalised to `priya@rubicotech.com` |
| TC-U-13 | CSV escaping | US-17 AC3 | P2 | `=SUM(A1)`, `+1`, `-1`, `@x`, `a,"b"` | `'=SUM(A1)`, `'+1`, `'-1`, `'@x`, `"a,""b"""` |
| TC-U-14 | Login lockout | US-02 AC3 · BR11 | P1 | 5 failures within 15 min; then 16 min later | Locked; then unlocked; a successful login resets the counter |
| TC-U-15 | Settings schema | US-05 AC2–4 | P2 | end ≤ start; cut-off ≥ slot start; slotMinutes 7 | 3 field errors |

## 2. API tests (`backend/tests/api`, Supertest)

### 2.1 Auth
| ID | Title | Story | Pri | Steps | Expected |
|---|---|---|---|---|---|
| TC-API-AUTH-01 | Sign up valid | US-01 AC1 | P1 | POST signup with valid body | 201; role `EMPLOYEE`; `Set-Cookie` has `HttpOnly`, `SameSite=Lax`; no `passwordHash` in the body |
| TC-API-AUTH-02 | Non-company domain | US-01 AC2 | P1 | POST signup `x@gmail.com` | 403 `DOMAIN_NOT_ALLOWED`; no user row |
| TC-API-AUTH-03 | Duplicate email (case-insensitive) | US-01 AC3/AC5 | P1 | Sign up `priya@rubicotech.com`, then ` PRIYA@rubicotech.com ` | 409 `EMAIL_EXISTS` |
| TC-API-AUTH-04 | No user enumeration | US-02 AC2 | P1 | Log in with a wrong password; log in with an unknown email | Both 401 with an **identical** body |
| TC-API-AUTH-05 | Lockout after 5 failures | US-02 AC3 | P1 | 5 wrong attempts, then the correct password | 6th → 429 `TOO_MANY_ATTEMPTS` |
| TC-API-AUTH-06 | Disabled account | US-02 AC4 | P1 | Admin deactivates the user; the user logs in | 403 `ACCOUNT_DISABLED` |
| TC-API-AUTH-07 | Logout invalidates the session | US-02 AC5 | P1 | Log in → logout → GET `/me` | 204, then 401 |
| TC-API-AUTH-08 | Weak password | US-01 AC4 | P1 | Sign up with `abc` | 400 `fields.password` |
| TC-API-AUTH-09 | Expired session | US-02 AC6 | P2 | Call `/me` with a token whose `exp` is in the past | 401 `SESSION_EXPIRED` |

### 2.2 Access control
| ID | Title | Story | Pri | Steps | Expected |
|---|---|---|---|---|---|
| TC-API-RBAC-01 | **RBAC matrix (data-driven)** | US-03 AC1–3 | P1 | For each endpoint × 4 roles, call it with a valid body | Status matches the matrix in `05-architecture.md §3` (2xx or 403); runs as one parameterised test (~25 endpoints × 4 roles) |
| TC-API-RBAC-02 | Unauthenticated | US-03 AC5 | P1 | Call every protected endpoint without a cookie | 401 `UNAUTHENTICATED` |
| TC-API-RBAC-03 | Staff cannot change settings | US-03 AC3 | P1 | STAFF `PUT /api/settings` | 403 |
| TC-API-RBAC-04 | IDOR on orders | US-03 AC4 | P1 | Employee B calls GET, QR and cancel on A's order | 404 for all three; A's order unchanged |
| TC-API-RBAC-05 | Employee cannot create menu items | US-03 AC2 | P1 | EMPLOYEE `POST /api/menu-items` | 403 |
| TC-API-RBAC-06 | Demotion applies immediately | US-03 AC6 | P1 | Manager logs in → admin demotes them to EMPLOYEE → the manager's existing session calls `POST /api/menu-items` | 403 |

### 2.3 Users and settings
| ID | Title | Story | Pri | Steps | Expected |
|---|---|---|---|---|---|
| TC-API-USR-01 | Search and paginate | US-04 AC1 | P2 | `GET /api/users?q=ram&page=1` | 200; only matching users; `pageSize` 20 |
| TC-API-USR-02 | Change role | US-04 AC2 | P1 | PATCH role MANAGER | 200; `/me` for that user shows MANAGER |
| TC-API-USR-03 | Deactivate | US-04 AC3 | P1 | PATCH `isActive:false` | 200; that user's login → 403 |
| TC-API-USR-04 | Last admin protected | US-04 AC4 | P1 | The only admin demotes or deactivates themselves | 409 `LAST_ADMIN` |
| TC-API-USR-05 | Unknown user | US-04 AC5 | P3 | PATCH `/api/users/999999` | 404 |
| TC-API-SET-01 | Save settings | US-05 AC1 | P1 | PUT valid settings; GET slots | 200; slots reflect the new window |
| TC-API-SET-02 | Invalid settings | US-05 AC2–4 | P1 | Three invalid bodies | 400 with field errors each time |
| TC-API-SET-03 | Cut-off change doesn't touch existing orders | US-05 AC5 | P2 | Place an order at 10:00; change the cut-off to 09:00 | The existing order is unchanged; a new order at 10:05 → 409 `CUTOFF_PASSED` |
| TC-API-SET-04 | Pickup location and slot capacity | US-05 AC1 | P1 | PUT `pickupLocation` "Building 4 · Counter A", `slotCapacity` 25; GET daily menu, slots and a new order | Daily menu and order show the location; slots report capacity 25 |

### 2.4 Menu
| ID | Title | Story | Pri | Steps | Expected |
|---|---|---|---|---|---|
| TC-API-MENU-01 | Create item | US-06 AC1 | P1 | POST with `pricePaise` 12000, category `MAIN`; repeat with `COMBO` and `LIGHT` | 201; item returned; new categories accepted, unknown category → 400 |
| TC-API-MENU-02 | Invalid item fields | US-06 AC2/3 | P1 | Price 0, −5, "abc", 100001; empty name; 81-char name | 400 with field errors |
| TC-API-MENU-03 | Duplicate name | US-06 AC4 | P2 | Create "Veg Biryani", then "veg biryani" | 409 `DUPLICATE_NAME` |
| TC-API-MENU-04 | Price snapshot | US-06 AC5 · BR6 | P1 | Order at ₹120; change the price to ₹150; GET the order | The order still shows 12000 paise; a new order uses 15000 |
| TC-API-MENU-05 | Publish daily menu | US-07 AC1 · US-08 AC1 | P1 | PUT `/api/daily-menu/2026-11-18`; GET as employee | 3 items with `remaining = quantity` |
| TC-API-MENU-06 | Quantity below ordered | US-07 AC2 · BR9 | P1 | 25 ordered; PUT quantity 20 | 409 `QTY_BELOW_ORDERED` |
| TC-API-MENU-07 | Invalid daily menu | US-07 AC3–5 | P2 | qty 0, −1, 1.5; duplicate item; past date | 400 each time |
| TC-API-MENU-08 | Not published / closed day | US-08 AC4/5 | P2 | GET a date with no menu; GET a Sunday | 422 `MENU_NOT_PUBLISHED`; `closed: true` |
| TC-API-MENU-09 | Archive item | US-06 AC6 | P3 | PATCH `isActive:false`; GET active items; GET an old order | Hidden from the active list; the old order still shows the name |

### 2.5 Orders
| ID | Title | Story | Pri | Steps | Expected |
|---|---|---|---|---|---|
| TC-API-ORD-01 | Place a valid order | US-09 AC1 | P1 | now 10:15; 2 × Veg Biryani (10 left); slot 13:00 | 201; `PLACED`; `totalPaise` 24000; 6-char code; menu shows `remaining` 8 |
| TC-API-ORD-02 | After cut-off | US-09 AC2/AC3 | P1 | now 11:00:00 and 11:00:05 | 409 `CUTOFF_PASSED`; no order row; stock unchanged |
| TC-API-ORD-03 | Out of stock | US-09 AC4 | P1 | 1 left; order 2 | 409 `OUT_OF_STOCK`; stock still 1 |
| TC-API-ORD-04 | One active order per day | US-09 AC6 · BR4 | P1 | Place an order, then place another | 409 `ORDER_EXISTS_FOR_DATE` |
| TC-API-ORD-05 | API validation without the UI | US-09 AC7 · US-15 AC2 | P1 | qty 6, 0, −3; `items: []`; missing `slotStart` | 400 `VALIDATION_ERROR` with `fields` |
| TC-API-ORD-06 | Invalid slot | US-09 AC8 | P1 | `slotStart` 12:10, 15:00 | 400 |
| TC-API-ORD-07 | Idempotency | US-09 AC9 | P1 | Send the same `Idempotency-Key` twice | 1st → 201, 2nd → 200 with the same `id`; one DB row |
| TC-API-ORD-08 | Date and item scope | US-09 AC10/AC11 | P2 | Date 19 Nov; date 16 Nov; an item from 18 Nov's menu on a 17 Nov order | 400 each time |
| TC-API-ORD-09 | **Concurrency: last portion** | US-09 AC5 · BR2 | P1 | 10 employees order the last 1 portion in parallel | Exactly one 201, nine 409 `OUT_OF_STOCK`; `remaining` = 0 |
| TC-API-ORD-10 | Cancel before cut-off | US-10 AC1 | P1 | Place 2 at 10:00; cancel at 10:40 | 200 `CANCELLED`; `remaining` back up by 2 |
| TC-API-ORD-11 | Cancel rejected | US-10 AC2–4 | P1 | Cancel at 11:05; cancel twice; cancel another user's order | 409 `CUTOFF_PASSED`; 409 `INVALID_STATUS`; 404 |
| TC-API-ORD-12 | Re-order after cancel | US-10 AC1 · BR4 | P1 | Place → cancel → place again the same day | 201 (the partial unique index allows it) |
| TC-API-ORD-13 | My orders | US-11 AC3/AC5 | P2 | User with 12 orders; page 1 and page 2; new user | Newest first, 10 then 2; new user gets an empty list |
| TC-API-ORD-14 | QR content | US-11 AC4 | P1 | GET `/qr`; decode the PNG (jsQR) | Decoded text equals `pickupCode` only (no ID, email or name) |
| TC-API-ORD-15 | Closed day | BR5 · US-08 AC5 | P2 | Order for a Saturday or a closed date | 422 `CANTEEN_CLOSED` |
| TC-API-ORD-16 | Slot full | US-19 AC1/AC2 | P1 | capacity 2; 2 orders in 13:00; a 3rd order | 409 `SLOT_FULL`; slots API shows `available:false` |

### 2.6 Staff operations
| ID | Title | Story | Pri | Steps | Expected |
|---|---|---|---|---|---|
| TC-API-STF-01 | Queue grouped by slot | US-12 AC1 | P1 | 5 orders in 2 slots; GET `/api/orders?date=` | 2 slot groups; `counts` correct; status filter works |
| TC-API-STF-02 | Valid transitions | US-12 AC2/AC3 | P1 | PLACED → PREPARING → READY | 200 each; `readyAt` set |
| TC-API-STF-03 | Invalid transitions | US-12 AC4 | P1 | PATCH COLLECTED; CANCELLED → PREPARING | 409 `INVALID_TRANSITION` |
| TC-API-STF-04 | Prep list | US-12 AC6 | P1 | 3 orders (1 cancelled) | Totals exclude the cancelled order |
| TC-API-STF-05 | Verify and collect | US-13 AC1/AC2 | P1 | READY order; verify; collect | 200; `COLLECTED`; `collectedAt` and `collectedById` = staff |
| TC-API-STF-06 | Lower-case code | US-13 AC3 | P2 | Verify `k7q4mz` | 200 |
| TC-API-STF-07 | Already collected | US-13 AC4 | P1 | Collect twice | 2nd → 409 `ALREADY_COLLECTED` |
| TC-API-STF-08 | Wrong date | US-13 AC5 | P1 | Verify tomorrow's order today | 409 `WRONG_DATE` |
| TC-API-STF-09 | Cancelled / unknown code | US-13 AC6/AC7 | P1 | Cancelled order code; `ZZZZZZ` | 409 `INVALID_STATUS`; 404 |
| TC-API-STF-10 | Not ready yet | US-13 AC8 | P2 | Verify a PLACED order; collect | `warning: "NOT_READY"`; collect → `COLLECTED` |

### 2.7 Reports, validation, system
| ID | Title | Story | Pri | Steps | Expected |
|---|---|---|---|---|---|
| TC-API-RPT-01 | Dashboard numbers | US-14 AC1–4, AC7 | P1 | Seed a known set (10 orders: 6 collected, 2 pending, 1 cancelled, 1 no-show) | KPIs match exactly; revenue excludes cancelled orders; items and slot counts correct; ADMIN gets the same data |
| TC-API-RPT-02 | Dashboard access and empty day | US-14 AC5/AC6 | P1 | EMPLOYEE call; a date with no orders | 403; all zeros, empty arrays |
| TC-API-RPT-03 | CSV export | US-17 AC1/AC2 | P2 | Export 1–30 Nov; range 120 days; `from > to` | 200 `text/csv` with correct headers and filename; 400; 400 |
| TC-API-RPT-04 | CSV formula injection | US-17 AC3 | P2 | User named `=HYPERLINK("x")` orders; export | The cell starts with `'=` |
| TC-API-RPT-05 | Dashboard extras from the design | US-14 AC1/AC2 | P1 | Seed 10 orders today (total ₹1,150, 6 collected) and 8 yesterday | `avgOrderPaise` 11500; `collectedPct` 60.0; `vsYesterdayPct` 25.0; `peakSlot` = busiest slot; `capacityPerSlot` from settings; item `remaining`/`soldOut` correct |
| TC-API-VAL-01 | Consistent error shape | US-15 AC2 | P1 | Trigger a 400 on 5 different endpoints | All match `{error:{code,message,fields?}}` |
| TC-API-VAL-02 | Malformed JSON | US-15 AC3 | P2 | Body `{"date":` | 400 `INVALID_JSON`; no stack trace in the body |
| TC-API-VAL-03 | Stored XSS payload | US-15 AC4 | P2 | Save a menu item named `<script>alert(1)</script>` | Stored and returned as a literal string (UI rendering checked in TC-UI-11) |
| TC-API-NTF-01 | Email failure doesn't block | US-18 AC3 | P2 | Email adapter forced to throw | Order 201; error logged |
| TC-API-SYS-01 | Health | NFR7 | P3 | GET `/api/health` | 200 `{status:"ok", db:"ok"}` |
| TC-API-SYS-02 | **Test clock disabled in prod** | Security | P1 | Against the production build (`ENABLE_TEST_CLOCK` unset), send `x-test-now: 2026-11-17T09:00+05:30` after the real cut-off | The header is ignored; the real time is used |
| TC-API-SYS-03 | No-show cron | US-20 AC1/AC2 | P2 | Without the secret; with the secret at 13:46 | 401; READY order → `NO_SHOW`, COLLECTED order unchanged |

## 3. UI tests (`frontend/tests/e2e`): Playwright

| ID | Title | Story | Pri | Project | Steps | Expected |
|---|---|---|---|---|---|---|
| TC-UI-01 | Sign up and client validation | US-01 AC1/2/4 · US-15 AC1 | P1 | desktop + mobile | Submit an empty form → see errors; enter a gmail address → see the domain error; enter valid details | Errors shown inline with **no network call** for client errors; valid sign-up lands on `/menu` |
| TC-UI-02 | Role landing and logout | US-02 AC1/AC5 | P1 | desktop | Log in as each of the 4 roles; log out; press Back | Correct home page for each role; after logout, Back → login page |
| TC-UI-03 | Navigation by role | US-03 AC1/AC2 | P1 | desktop | As EMPLOYEE, check the nav and then open `/manager/menu` | Only Menu, My Orders and Profile visible; the page shows "Not authorised" |
| TC-UI-04 | Admin changes a role | US-04 AC2 | P2 | desktop | Users → search → change role → save | Success toast; the table shows the new role |
| TC-UI-05 | Manager builds a menu | US-06 AC1 · US-07 AC1 | P1 | desktop | Add an item; open Daily menu for tomorrow; set quantities; save | The employee view for tomorrow shows the items |
| TC-UI-06 | **Golden path end to end** | US-09 AC1 · US-11 AC1/2 · US-12 AC2/3 · US-13 AC2/3 | P1 | desktop + mobile | Employee orders 1 Veg Biryani for slot 13:00 → sees the QR and code → staff (2nd context) Start → Ready → enters the code → Hand over → employee reloads | Statuses progress correctly; the employee sees **COLLECTED**; the dashboard count goes up by 1 |
| TC-UI-07 | Sold out and stepper limits | US-08 AC2 · US-09 AC7 | P1 | mobile | View a sold-out item; increase the stepper to 5 | Add is disabled; + is disabled at 5 |
| TC-UI-08 | After cut-off | US-08 AC3 · US-10 AC2 | P1 | mobile | Test clock 11:05; open Menu and My Orders | Closed banner; Tomorrow tab; Cancel button hidden |
| TC-UI-09 | Cancel order | US-10 AC1 | P1 | mobile | Cancel → confirm the dialog | Status CANCELLED; menu stock increases |
| TC-UI-10 | Scan error states | US-13 AC4/5/7 | P2 | desktop (tablet size) | Enter a collected code, tomorrow's code and `ZZZZZZ` | The correct red message for each |
| TC-UI-11 | XSS rendered as text | US-15 AC4 | P2 | desktop | View the menu with the `<script>` item | The literal text is visible; no dialog event fires |
| TC-UI-12 | Mobile layout | US-16 AC1 · NFR6 | P1 | mobile (360×740) | Open Menu, Checkout and My Orders | `document.documentElement.scrollWidth <= 360`; bottom nav visible; buttons ≥ 44 px tall |
| TC-UI-13 | Dashboard | US-14 AC1/AC4/AC6 | P2 | desktop | Open the dashboard; change to a date with no orders | 6 KPI tiles; the empty state is shown |
| TC-UI-14 | CSV download | US-17 AC1 | P3 | desktop | Click Export CSV | A download event fires with filename `orders_*.csv` |
| TC-UI-15 | Cancelled order in the staff queue | US-12 AC5 | P3 | desktop | Employee cancels; staff open the Queue | The card is greyed out with no Start, Ready or Hand-over buttons |
| TC-UI-16 | Visual match with the Stitch design | US-16 AC1 | P2 | mobile (390×844) + desktop (1280) | Screenshot S3, S4, S5 and S10 with the demo seed; compare side by side with `docs/design/*/screen.png` | Layout, colours, fonts and components match; differences are either listed as decisions D1–D21 or logged as bugs |

## 4. Manual tests

| ID | Title | Story | Pri | Steps | Expected |
|---|---|---|---|---|---|
| TC-M-01 | Camera QR scan on a real device | US-13 AC1 | P1 | Staff phone scans the QR shown on an employee's phone | The order loads in under 2 s |
| TC-M-02 | Tablet and desktop layouts | US-16 AC2/AC3 | P2 | 768 px queue; 1280 px dashboard | 2-column queue; KPI tiles in one row |
| TC-M-03 | Emails received | US-18 AC1/AC2 | P2 | Place an order; mark it READY | Both emails arrive with the correct code |
| TC-M-04 | Exploratory: cut-off rush | R2 | P2 | 30-min charter: order, cancel and re-order near 10:59 with network throttling (Slow 3G) | Notes and bugs logged |
| TC-M-05 | Exploratory: counter chaos | R4 | P2 | 30-min charter: rapid scans, duplicate scans, wrong-day codes, airplane mode | Notes and bugs logged |

## 5. Non-functional tests

| ID | Title | Req | Pri | Details |
|---|---|---|---|---|
| TC-NFR-01 | Load: pre-cut-off ordering rush | NFR1 | P1 | See [`07-non-functional-test.md`](07-non-functional-test.md) |
| TC-NFR-02 | Overselling invariant under load | NFR2 | P1 | Same run; DB check afterwards |
| TC-NFR-03 | Lighthouse accessibility *(optional)* | NFR5 | P3 | Score ≥ 90 on `/menu`, `/orders`, `/staff/queue` |
| TC-NFR-04 | OWASP ZAP baseline scan *(optional)* | NFR3 | P3 | No High alerts |

**Totals:** 15 unit · 71 API · 16 UI · 5 manual · 4 non-functional = **111 test cases**
