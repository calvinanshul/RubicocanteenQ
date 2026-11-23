# Stage 2 — Requirements (MoSCoW)

**Product:** CanteenQ — Office Canteen Pre-order · **Version:** 1.0

## 1. Roles

| Role | Who | Summary of access |
|---|---|---|
| **EMPLOYEE** | Any staff member with a company email | Browse menu, place/cancel own orders, see own history and QR |
| **STAFF** | Canteen counter / kitchen staff | Order queue, change order status, verify pickup by QR/code, prep list |
| **MANAGER** | Canteen manager (vendor) | Everything STAFF can do, plus menu items, daily menu and quantities, dashboard, CSV exports |
| **ADMIN** | Facilities / HR admin | Users and roles, canteen settings, closed days, read-only dashboard, exports |

> New sign-ups always get the **EMPLOYEE** role. Only an ADMIN can give someone a higher role. The first ADMIN is created by a seed script.

## 2. Feature list

### MUST — the MVP (fits in about 4–5 build days)

> v2: **M17 Slot capacity** was promoted from Should (S03) because the chosen design depends on it (decision D8).

| ID | Feature | Description | Roles |
|---|---|---|---|
| **M01** | Sign-up, login, logout | Sign up with name, company email and password; log in and out; bcrypt password hashing; session in an httpOnly cookie | All |
| **M02** | Role-based access control | Server-side checks on every API call and route; UI shows only the menus the role is allowed to use | All |
| **M03** | User management | Admin lists and searches users, changes roles, deactivates or reactivates accounts. Cannot remove the last admin. | ADMIN |
| **M04** | Canteen settings | Cut-off time, pickup window, slot length, max quantity per item, allowed email domains, closed weekdays | ADMIN |
| **M05** | Menu item catalogue | Create, edit and archive dishes: name, description, category, price, veg/non-veg flag, active flag | MANAGER |
| **M06** | Daily menu and quantities | For a date, choose which dishes are served and their daily quantity limit | MANAGER |
| **M07** | Browse today's menu | See the menu for today and tomorrow with price, veg flag and **remaining quantity**; sold-out items are marked | EMPLOYEE |
| **M08** | Place a pre-order | Cart → choose pickup slot → confirm. Enforces the cut-off, stock (no overselling), max quantity per item, one active order per day, and closed days | EMPLOYEE |
| **M09** | Cancel an order | Cancel your own order **before the cut-off**; the quantity goes back to stock | EMPLOYEE |
| **M10** | Pickup QR code and code | Each order gets a unique 6-character pickup code shown as a QR code | EMPLOYEE |
| **M11** | My orders / history | List of your own orders with status, total and date | EMPLOYEE |
| **M12** | Staff order queue | Today's orders grouped by slot; change status PLACED → PREPARING → READY | STAFF, MANAGER |
| **M13** | Verify pickup | Scan the QR code or type the code → see the order → mark COLLECTED. Rejects wrong-day, cancelled or already-collected orders | STAFF, MANAGER |
| **M14** | Dashboard | For a chosen date: total orders, revenue, quantity per item (prep list), orders per slot, status breakdown | MANAGER, ADMIN |
| **M15** | Validation | The same rules on UI and API (shared schemas); clear field-level error messages; consistent error JSON | All |
| **M16** | Responsive UI | Usable at 360 px (phone), 768 px (tablet) and 1280 px (desktop), following the Stitch "Fresh Counter" design | All |
| **M17** | Slot capacity | A maximum number of orders per pickup slot (default 30); full slots are shown as "Full" and cannot be chosen | EMPLOYEE, ADMIN |

### SHOULD — high value, build if time allows (in this order)

| ID | Feature | Description |
|---|---|---|
| **S01** | CSV export | Orders for a date range, and a per-employee monthly statement (for billing) |
| **S02** | Email notifications | Order confirmation and "order is READY" emails (Resend free tier) |
| ~~S03~~ | ~~Slot capacity~~ | **Moved to Must as M17** (v2) |
| **S04** | Auto NO_SHOW | A scheduled job marks uncollected orders as NO_SHOW at slot end + grace period |
| **S05** | Closed dates | Admin adds holidays; ordering is blocked on those dates |
| **S06** | Edit an order | Change items or slot before the cut-off |
| **S07** | Dietary filters | Filter by veg, non-veg or Jain; show allergens |
| **S08** | Audit log | Record who changed a role, a setting or an order status |

### COULD — nice to have

| ID | Feature |
|---|---|
| C01 | "Reorder my last order" shortcut |
| C02 | Dish rating and feedback after collection |
| C03 | Installable PWA with push notification when the order is READY |
| C04 | Weekly menu planning (copy last week's menu) |
| C05 | Dark mode |
| C06 | Hindi / regional-language UI |
| C07 | Apple / Google Wallet pickup pass (shown in the Stitch design; needs signed passes and a paid developer account) |

### WON'T — explicitly out of scope for this release

| ID | Out of scope | Reason |
|---|---|---|
| W01 | Online payment / wallet / payment gateway | Compliance and integration effort; billing is handled at month-end (assumption A3) |
| W02 | Payroll or HRMS integration | No access to company systems; CSV export covers the need |
| W03 | SSO (Google / Microsoft / Okta) | Needs company IdP configuration; email and password are enough for the MVP |
| W04 | Several canteens, sites or vendors | Assumption A1 |
| W05 | Inventory and raw-material management | Separate product |
| W06 | Native iOS / Android apps | A responsive web app is enough |
| W07 | Delivery to desk | Operational change, not software |
| W08 | Breakfast, snacks and dinner menus | Lunch-only MVP (A2); the model allows it later |

## 3. Business rules

| ID | Rule |
|---|---|
| BR1 | Orders for date **D** can be placed or cancelled only while `now (IST) < D + cutoffTime`. Orders can be placed for **today** or **tomorrow** only. |
| BR2 | The total ordered for a daily-menu item can **never exceed** its daily quantity, even under concurrent requests. |
| BR3 | Quantity per item per order: 1 to `maxQtyPerItem` (default 5). An order needs at least 1 item. |
| BR4 | One **active** order (status not CANCELLED) per employee per date. |
| BR5 | No ordering on closed weekdays or closed dates. |
| BR6 | Prices are copied onto the order when it is placed, so a later price change does not alter existing orders. |
| BR7 | Allowed status changes: `PLACED → PREPARING → READY → COLLECTED`; `PLACED → CANCELLED` (by the employee, before the cut-off); `READY/PREPARING/PLACED → NO_SHOW` (system or manager, after the slot ends). No other changes are allowed. |
| BR8 | A pickup code is valid only on the order's date and only once. |
| BR9 | A manager cannot set a daily quantity **below** the quantity already ordered. |
| BR10 | Passwords: 8–64 characters, with at least one letter and one number; stored with bcrypt (cost 12). |
| BR11 | After 5 failed logins in 15 minutes, logins for that email are blocked for 15 minutes. |
| BR12 | Deactivated users cannot log in, and their existing sessions are rejected. |

## 4. Non-functional requirements

| ID | Category | Requirement | Verified by |
|---|---|---|---|
| NFR1 | Performance | `POST /api/orders` p95 < **800 ms**, error rate < **1%** at **100 concurrent users** (ramping to the 300-user peak in A10 as a stretch goal) | k6 load test (TC-NFR-01) |
| NFR2 | Data integrity | Zero overselling under concurrent ordering | k6 + DB check (TC-NFR-02) |
| NFR3 | Security | OWASP Top-10 basics: hashed passwords, httpOnly + SameSite cookies, server-side RBAC, input validation, no secrets in the repo | Unit/API tests + ZAP baseline scan (optional) |
| NFR4 | Usability | Place an order in **≤ 4 taps** from the menu; tap targets ≥ 44 px | Manual UI test |
| NFR5 | Accessibility | Lighthouse accessibility score ≥ 90 on key screens | Lighthouse (optional) |
| NFR6 | Responsiveness | No horizontal scroll at 360 px | Playwright mobile project |
| NFR7 | Availability | Best effort on free tiers; health endpoint `/api/health`. When a request takes over 1 s, the UI shows a loader (top progress bar and spinner) | Manual |

## 5. MVP definition

> **The MVP is done** when an employee can sign up, order lunch from today's menu before the cut-off, get a QR code, and collect the food by having the QR code scanned. The manager must be able to set the menu and quantities and see the prep list and dashboard, and the admin must be able to manage users and settings. All of this must work on a phone, be covered by automated tests and be deployed on a free tier.

## 6. Change log

| Date | Change | Reason |
|---|---|---|
| | v1.0 baseline | |
| 18 Nov 2026 | **Tech stack changed to Option B** (React + Vite frontend, Express API, Prisma + Neon; Netlify + Render) | ADR-001 v2: re-scored with honest skill levels and in-process API testing |
| 18 Nov 2026 | **Stitch "Fresh Counter" design adopted** (`docs/design/`) | Final UI design for the project |
| 18 Nov 2026 | S03 Slot capacity promoted to **Must (M17)** | The checkout design shows full slots (D8) |
| 18 Nov 2026 | Added Could **C07** Wallet pass | Shown in the design but out of scope (D11) |
| 18 Nov 2026 | Data additions: `pickupLocation` setting, optional `employeeCode` and `department` on users, categories `COMBO` and `LIGHT`, extra dashboard KPIs | Needed by the design (D1, D2, D5, D14, D17) |
| 19 Nov 2026 | Company email can be **@company.com or @company.in**: default `allowedDomains` = `company.com,company.in` (migration `20261119070000_allow_company_in` updates installs still on the old default) | Change request: the company uses both domains (assumption A4) |
| 19 Nov 2026 | Sign-up domains are the company's real domains **@rubicotech.com and @rubicotech.in** (default `allowedDomains`; migration `20261119080000_rubicotech_domains`); demo accounts and tests use `@rubicotech.com`; `ALLOWED_EMAIL_DOMAINS` in the project `.env` can override | Change request ("company" was a placeholder) |

### 6.1 Design decisions (Stitch design vs requirements)

The AI design tool added details that the requirements didn't cover. Each one was reviewed against the requirements, the data model and the one-week scope.

| # | Element in the design | Screen | Decision |
|---|---|---|---|
| D1 | Pickup location ("Building 4 · Counter A", "Counter 2", "Counter C-04") | S3, S4, S5 | **Keep, simplified:** one `pickupLocation` setting shown everywhere |
| D2 | Category labels MAINS / COMBO / LIGHT / DRINK | S3 | **Keep:** category enum becomes MAIN, COMBO, LIGHT, SIDE, DESSERT, BEVERAGE |
| D3 | Filter chips with counts | S3 | **Keep:** counted on the client |
| D4 | User photos | All | **Simplify:** initials avatar |
| D5 | Employee ID on checkout ("#EMP-8921") | S4 | **Keep, optional:** `employeeCode` set by the admin |
| D6 | "Corporate meal subsidy" and "Taxes & platform fees" rows | S4 | **Drop:** no payment or subsidy logic (W01) |
| D7 | "Step 2 of 2" + "12m window active" timer | S4 | **Simplify:** progress shows Menu → Checkout; the timer shows time left to the cut-off |
| D8 | Full slot "Kitchen capacity reached" | S4 | **Keep:** slot capacity promoted to Must (M17) |
| D9 | "Tokens expire 10 mins post-window" | S4 | **Align:** text uses the `noShowGraceMinutes` setting (default 30) |
| D10 | "Priority Ready · Counter C-04" | S4 | **Simplify:** "Your pickup: Today · 13:00–13:15 · {pickupLocation}" |
| D11 | "Save to Apple / Google Wallet" | S5 | **Drop** (now Could C07) |
| D12 | Decorative QR artwork; dish named "Veg Dum Biryani" in one place | S5 | **Fix:** real QR from the API; names always from the order snapshot |
| D13 | "In 18 mins", "Placed at 10:18 AM" | S5 | **Keep:** derived on the client |
| D14 | KPI extras (vs yesterday, average per order, collected %, est. wait, "refunded", "counter holding") | S10 | **Keep** the first three; **drop** the rest (no data, no payments, no counters) |
| D15 | Slot panel with capacity, peak, "stations boosted", "bottleneck alerts" | S10 | **Keep** capacity and peak; **drop** stations and alerts |
| D16 | Live orders feed with "Mark Collected", "Call Station", "Notify / Void" | S10 | **Keep** the feed; actions are Start / Ready / Mark no-show; "Mark Collected" opens the pickup-code check (BR8) |
| D17 | "Desk 4B · Tech Eng" | S10 | **Keep, optional:** `department`; drop desk |
| D18 | "Live sync", "Terminal sync", "4 active terminals", "Open KDS" | S10 | **Simplify:** "Last updated" indicator; "Open KDS" links to the prep list |
| D19 | "Settings & Rules" in the manager sidebar | S10 | **Keep RBAC:** settings stay admin-only |
| D20 | Sold-out button labelled "Unavailable" | S3 | **Keep** |
| D21 | Broken logo image | S3, S10 | **Fix:** text wordmark |
