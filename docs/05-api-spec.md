# Stage 5c — API List

Base URL: `/api` (the browser calls the Netlify domain; Netlify proxies `/api/*` to the Express API on Render) · Format: JSON (UTF-8) · Auth: session cookie `cq_session` (httpOnly JWT) · Times: `HH:mm` IST · Dates: `YYYY-MM-DD` (IST) · Money: integer **paise** in requests and responses (`totalPaise: 24000` = ₹240.00)

## Standard error format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please fix the highlighted fields",
    "fields": { "items.0.qty": "Quantity must be between 1 and 5" }
  }
}
```

| HTTP | Codes used |
|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_JSON` |
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `SESSION_EXPIRED` |
| 403 | `FORBIDDEN`, `DOMAIN_NOT_ALLOWED`, `ACCOUNT_DISABLED` |
| 404 | `NOT_FOUND` |
| 409 | `EMAIL_EXISTS`, `LAST_ADMIN`, `DUPLICATE_NAME`, `DUPLICATE_DATE`, `QTY_BELOW_ORDERED`, `CUTOFF_PASSED`, `OUT_OF_STOCK`, `ORDER_EXISTS_FOR_DATE`, `SLOT_FULL`, `INVALID_STATUS`, `INVALID_TRANSITION`, `ALREADY_COLLECTED`, `WRONG_DATE` |
| 422 | `CANTEEN_CLOSED`, `MENU_NOT_PUBLISHED` |
| 429 | `TOO_MANY_ATTEMPTS` |
| 500 | `INTERNAL_ERROR` (generic message, no stack trace) |

---

## 1. Auth

| # | Method & path | Roles | Request | Success response | Errors |
|---|---|---|---|---|---|
| A1 | `POST /api/auth/signup` | Public | `{ "name": "Priya Sharma", "email": "priya@rubicotech.com", "password": "Lunch2026" }` | **201** `{ "id": 7, "name": "Priya Sharma", "email": "priya@rubicotech.com", "role": "EMPLOYEE" }` + `Set-Cookie` | 400 `VALIDATION_ERROR` · 403 `DOMAIN_NOT_ALLOWED` · 409 `EMAIL_EXISTS` |
| A2 | `POST /api/auth/login` | Public | `{ "email": "...", "password": "..." }` | **200** `{ "user": { id, name, email, role } }` + `Set-Cookie` | 400 · 401 `INVALID_CREDENTIALS` · 403 `ACCOUNT_DISABLED` · 429 `TOO_MANY_ATTEMPTS` |
| A3 | `POST /api/auth/logout` | Any logged-in user | — | **204** (cookie cleared) | — |
| A4 | `GET /api/auth/me` | Any logged-in user | — | **200** `{ id, name, email, role, employeeCode, department }` | 401 |
| A5 | `GET /api/auth/signup-config` | Public | — | **200** `{ "allowedDomains": ["rubicotech.com", "rubicotech.in"] }` (lets the S2 form check the domain before submitting, US-15 AC1) | — |

## 2. Users (Admin)

| # | Method & path | Roles | Request | Success response | Errors |
|---|---|---|---|---|---|
| U1 | `GET /api/users?q=&role=&page=1` | ADMIN | query | **200** `{ "items": [{ id, name, email, role, isActive }], "page": 1, "pageSize": 20, "total": 134 }` | 401 · 403 |
| U2 | `PATCH /api/users/:id` | ADMIN | `{ "role"?: "MANAGER", "isActive"?: false, "employeeCode"?: "EMP-8921", "department"?: "Tech Eng" }` | **200** updated user | 400 · 403 · 404 · 409 `LAST_ADMIN` |

## 3. Settings & calendar

| # | Method & path | Roles | Request | Success response | Errors |
|---|---|---|---|---|---|
| S1 | `GET /api/settings` | Any logged-in user | — | **200** `{ "orderCutoff": "11:00", "slotStart": "12:30", "slotEnd": "14:30", "slotMinutes": 15, "slotCapacity": 30, "pickupLocation": "Building 4 · Counter A", "noShowGraceMinutes": 30, "maxQtyPerItem": 5, "closedWeekdays": [0,6] }` (`allowedDomains` returned to ADMIN only) | 401 |
| S2 | `PUT /api/settings` | ADMIN | full settings object | **200** saved settings | 400 (end ≤ start, cut-off ≥ slot start, slotMinutes ∉ {10,15,20,30}, slotCapacity ∉ 1–500, pickupLocation > 80 chars) · 403 |
| S3 | `GET /api/closed-dates?from=&to=` | Any logged-in user | query | **200** `[{ "date": "2026-11-25", "reason": "Holiday" }]` | 400 · 401 |
| S4 | `POST /api/closed-dates` | ADMIN | `{ "date": "2026-11-25", "reason": "Holiday" }` | **201** | 400 · 403 · 409 |
| S5 | `DELETE /api/closed-dates/:date` | ADMIN | — | **204** | 403 · 404 |

## 4. Menu

| # | Method & path | Roles | Request | Success response | Errors |
|---|---|---|---|---|---|
| M1 | `GET /api/menu-items?active=true` | MANAGER | query | **200** `[{ id, name, description, category, pricePaise, diet, isActive }]` | 401 · 403 |
| M2 | `POST /api/menu-items` | MANAGER | `{ "name": "Veg Biryani", "description": "...", "category": "MAIN", "pricePaise": 12000, "diet": "VEG" }` (category: MAIN, COMBO, LIGHT, SIDE, DESSERT, BEVERAGE) | **201** item | 400 · 403 · 409 `DUPLICATE_NAME` |
| M3 | `PATCH /api/menu-items/:id` | MANAGER | any subset of M2 fields + `isActive` | **200** item | 400 · 403 · 404 · 409 |
| M4 | `GET /api/daily-menu?date=2026-11-17` | Any logged-in user | query | **200** `{ "date": "2026-11-17", "orderingOpen": true, "cutoff": "11:00", "closed": false, "pickupLocation": "Building 4 · Counter A", "items": [{ "dailyMenuItemId": 31, "menuItemId": 4, "name": "Veg Biryani", "pricePaise": 12000, "diet": "VEG", "category": "MAIN", "quantity": 80, "remaining": 12 }] }` | 400 (bad date) · 401 · 422 `MENU_NOT_PUBLISHED` |
| M5 | `PUT /api/daily-menu/:date` | MANAGER | `{ "entries": [{ "menuItemId": 4, "quantity": 80 }] }` (replaces the menu for the date; removing an item that has orders is rejected) | **200** same shape as M4 | 400 (past date, duplicate item, qty not 1–1000) · 403 · 409 `QTY_BELOW_ORDERED` |
| M6 | `GET /api/slots?date=2026-11-17` | Any logged-in user | query | **200** `[{ "start": "12:30", "end": "12:45", "booked": 18, "capacity": 25, "available": true }]` | 400 · 401 |

## 5. Orders — Employee

| # | Method & path | Roles | Request | Success response | Errors |
|---|---|---|---|---|---|
| O1 | `POST /api/orders` | EMPLOYEE | Header `Idempotency-Key: <uuid>`; body `{ "date": "2026-11-17", "slotStart": "13:00", "items": [{ "dailyMenuItemId": 31, "qty": 2 }] }` | **201** `{ "id": 501, "status": "PLACED", "date": "2026-11-17", "slotStart": "13:00", "slotEnd": "13:15", "pickupLocation": "Building 4 · Counter A", "createdAt": "2026-11-17T04:48:00Z", "pickupCode": "K7Q4MZ", "totalPaise": 24000, "items": [{ "name": "Veg Biryani", "qty": 2, "unitPricePaise": 12000 }] }` · **200** with the same body if the idempotency key is repeated | 400 `VALIDATION_ERROR` (qty, empty cart, invalid slot, date not today/tomorrow, item not on this date) · 409 `CUTOFF_PASSED` / `OUT_OF_STOCK` / `ORDER_EXISTS_FOR_DATE` / `SLOT_FULL` · 422 `CANTEEN_CLOSED` / `MENU_NOT_PUBLISHED` |
| O2 | `GET /api/orders/me?page=1&date=` (optional `date` filter, used for "You already have an order") | EMPLOYEE | query | **200** `{ "items": [order…], "page": 1, "pageSize": 10, "total": 23 }` | 401 · 403 |
| O3 | `GET /api/orders/:id` | Owner (EMPLOYEE), STAFF | — | **200** order (+ `employee: { name }` for staff) | 401 · 404 (not the owner or not found) |
| O4 | `GET /api/orders/:id/qr` | Owner | — | **200** `image/png` (QR encodes the pickup code only) | 401 · 404 |
| O5 | `POST /api/orders/:id/cancel` | Owner | — | **200** order with `status: "CANCELLED"` | 401 · 404 · 409 `CUTOFF_PASSED` / `INVALID_STATUS` |

> **Sprint 02 additions.** Order responses (O1, O3, O5, O2 items) also include `cancellable` (PLACED and before the cut-off), `cutoff`, `readyAt`, `collectedAt`, `cancelledAt` and `serverTime`. M4 also returns `serverTime`. Both honour the test clock, so the UI's countdown and "In N mins" use server time, never the device clock (BR1). `Idempotency-Key` values are scoped per user, so one user's key can never return another user's order.

## 6. Orders — Staff

> Staff only since 2026-11-23: managers get 403 on Q1–Q4, O3 and R2 (the orders queue & prep section is not part of the manager console).

| # | Method & path | Roles | Request | Success response | Errors |
|---|---|---|---|---|---|
| Q1 | `GET /api/orders?date=&slot=&status=` | STAFF | query | **200** `{ "date": "...", "slots": [{ "start": "13:00", "orders": [{ id, pickupCode, employeeName, department, status, items }] }], "counts": { "PLACED": 40, "READY": 12, ... }, "lastUpdated": "..." }`. Extra query `?limit=5&sort=recent` returns the newest orders for the dashboard's live feed | 400 · 401 · 403 |
| Q2 | `PATCH /api/orders/:id/status` | STAFF | `{ "status": "PREPARING" }` (or `"READY"`, `"NO_SHOW"`) (COLLECTED only via Q4) | **200** order | 400 · 403 · 404 · 409 `INVALID_TRANSITION` |
| Q3 | `POST /api/orders/verify` | STAFF | `{ "pickupCode": "k7q4mz" }` (case-insensitive) | **200** `{ order, "warning": null }` (or `"NOT_READY"`) | 400 · 403 · 404 · 409 `ALREADY_COLLECTED` / `WRONG_DATE` / `INVALID_STATUS` |
| Q4 | `POST /api/orders/:id/collect` | STAFF | — | **200** order `COLLECTED` (records `collectedAt`, `collectedById`) | 403 · 404 · 409 `ALREADY_COLLECTED` / `WRONG_DATE` / `INVALID_STATUS` |

> **Sprint 03 additions.** Q1: `date` is optional (defaults to today on the server clock), and `status` also accepts `ISSUES` (= CANCELLED + NO_SHOW, the queue's Issues tab); `counts` covers all statuses plus `ALL`, and each order carries `slotEnd`, `items[].diet`, `readyAt` and `collectedAt`. Q2: `NO_SHOW` is only accepted after the slot has ended (409 before). Q3: the code is trimmed and upper-cased; a malformed code is a 400. Q3/Q4 error messages are the S8 texts ("Already collected at 13:04", "This order is for 18 Nov, not today", "This order was cancelled", "Code not found"). R1/R2: `date` is optional (default today). R1 `peakSlot`: most non-cancelled orders, a tie goes to the earliest slot.

> **Sprint 04 additions.** U1 also returns `roleCounts` (`ALL`, `EMPLOYEE`, `STAFF`, `MANAGER`, `ADMIN`) for the same search text, for the S14 filter chips; search matches name, email, employee code and department as plain text. U2 rejects unknown fields; `employeeCode`/`department` accept `null` to clear; every change is written to the audit log. O2 also returns `summary: { month, orders, totalPaise }` (this month on the server clock, all orders except CANCELLED) for the S6 header. M1 `active=false` lists archived items too. S4 answers 409 `DUPLICATE_DATE` for a date that is already closed. R4's file name is `statement_<month>.csv`. CSV amounts (`total_inr`) are plain rupees with two decimals (`240.00`), items are `2 x Veg Biryani; 1 x Lassi`, and lines end with CRLF.

## 7. Reports

| # | Method & path | Roles | Request | Success response | Errors |
|---|---|---|---|---|---|
| R1 | `GET /api/reports/dashboard?date=` | MANAGER, ADMIN | query | **200** `{ "date": "...", "kpis": { "orders": 120, "revenuePaise": 1380000, "avgOrderPaise": 11500, "collected": 90, "collectedPct": 75.0, "pending": 20, "cancelled": 6, "noShow": 4, "vsYesterdayPct": 14.3 }, "items": [{ "name": "Veg Biryani", "diet": "VEG", "ordered": 68, "quantity": 80, "remaining": 12, "soldOut": false }], "slots": [{ "start": "12:30", "count": 14 }], "capacityPerSlot": 30, "peakSlot": "13:00" }` (`vsYesterdayPct` is `null` when the previous working day had no orders) | 400 · 401 · 403 |
| R2 | `GET /api/reports/prep-list?date=` | STAFF | query | **200** `[{ "name": "Veg Biryani", "qty": 68 }]` | 400 · 401 · 403 |
| R3 | `GET /api/reports/orders.csv?from=&to=` | MANAGER, ADMIN | query (≤ 92 days) | **200** `text/csv` with `Content-Disposition: attachment; filename="orders_<from>_<to>.csv"` | 400 · 401 · 403 |
| R4 | `GET /api/reports/statement.csv?month=2026-11` | MANAGER, ADMIN | query | **200** `text/csv`: employee, employee_code, department, email, orders, total_inr | 400 · 401 · 403 |

## 8. System

| # | Method & path | Roles | Request | Success response | Errors |
|---|---|---|---|---|---|
| X1 | `GET /api/health` | Public | — | **200** `{ "status": "ok", "db": "ok", "time": "..." }` | 503 if the DB is unreachable |
| X3 | `GET /api/time` | Public | — | **200** `{ "serverTime": "2026-11-17T04:35:00.000Z", "today": "2026-11-17" }` (honours the test clock; `Cache-Control: no-store`). The UI takes "today", the countdown and the counter clock from this, never the device clock (BR1, BUG-03-001) | — |
| X2 | `POST /api/cron/no-show` | GitHub Actions scheduled workflow (header `Authorization: Bearer $CRON_SECRET`) | — | **200** `{ "updated": 4 }` | 401 |

---

## Validation rules (shared Zod schemas, `shared/src/schemas`)

| Field | Rule |
|---|---|
| `name` (user) | trimmed, 2–80 chars |
| `email` | valid email, ≤ 254 chars, trimmed + lower-cased, domain in `allowedDomains` |
| `password` | 8–64 chars, ≥ 1 letter and ≥ 1 digit |
| `pricePaise` | integer 100–100000 |
| `quantity` (daily) | integer 1–1000 |
| `qty` (order item) | integer 1–`maxQtyPerItem` |
| `items` (order) | 1–10 entries, no duplicate `dailyMenuItemId` |
| `date` | `YYYY-MM-DD`, a valid calendar date |
| `slotStart` | `HH:mm`, inside the window and on a slot boundary |
| `employeeCode` | optional, 3–20 chars, letters, digits and `-` |
| `pickupLocation` | 1–80 chars |
| `pickupCode` | 6 chars from `[A-HJ-NP-Z2-9]` after upper-casing (no I, O, 0 or 1) |
