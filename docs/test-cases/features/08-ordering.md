# 08 · Ordering and checkout

Ordering rules, slots and capacity, place order, idempotency, concurrency (US-09, US-19, S4, O1, M6).

Sprints: S01, S02 · Cases: 45 (21 test cases, 24 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-U-04 | IST/UTC boundary | S01 | Unit | P1 | A11 · BR1 · AC 00-8 | `2026-11-17T05:29:59Z` and `05:30:00Z`; `2026-11-16T18:31:00Z` | open / closed; "today" = 17 Nov (IST) | `api-u/clock.test.ts` › IST clock (TC-U-04) | ✅ |
| TC-U-11 | Order schema validation | S01 | Unit | P1 | US-09 AC7 · US-15 · AC 00-2 | qty 0, 6, 2.5, "a"; empty items; duplicate item IDs | Each case is rejected with a field-specific message | `shared/schemas.test.ts` › order schema | ✅ |
| TC-API-ORD-01 | Place a valid order | S02 | API | P1 | US-09 AC1 · AC 04-3 | now 10:15; 2 × Veg Biryani (10 left); slot 13:00 | 201; `PLACED`; `totalPaise` 24000; 6-char code; menu shows `remaining` 8 | `api/sprint02/orders.test.ts` | ✅ |
| TC-API-ORD-02 | After cut-off | S02 | API | P1 | US-09 AC2/AC3 · AC 04-3 | now 11:00:00 and 11:00:05 | 409 `CUTOFF_PASSED`; no order row; stock unchanged | `api/sprint02/orders.test.ts` | ✅ |
| TC-API-ORD-03 | Out of stock | S02 | API | P1 | US-09 AC4 · AC 04-3 | 1 left; order 2 | 409 `OUT_OF_STOCK`; stock still 1 | `api/sprint02/orders.test.ts` | ✅ |
| TC-API-ORD-04 | One active order per day | S02 | API | P1 | US-09 AC6 · BR4 · AC 04-3 | Place an order, then place another | 409 `ORDER_EXISTS_FOR_DATE` | `api/sprint02/orders.test.ts` | ✅ |
| TC-API-ORD-05 | API validation without the UI | S02 | API | P1 | US-09 AC7 · US-15 AC2 · AC 04-3 | qty 6, 0, −3; `items: []`; missing `slotStart` | 400 `VALIDATION_ERROR` with `fields` | `api/sprint02/orders.test.ts` | ✅ |
| TC-API-ORD-06 | Invalid slot | S02 | API | P1 | US-09 AC8 · AC 04-3 | `slotStart` 12:10, 15:00 | 400 | `api/sprint02/orders.test.ts` | ✅ |
| TC-API-ORD-07 | Idempotency | S02 | API | P1 | US-09 AC9 · AC 04-3 | Send the same `Idempotency-Key` twice | 1st → 201, 2nd → 200 with the same `id`; one DB row | `api/sprint02/orders.test.ts` | ✅ |
| TC-API-ORD-08 | Date and item scope | S02 | API | P2 | US-09 AC10/AC11 · AC 04-3 | Date 19 Nov; date 16 Nov; an item from 18 Nov's menu on a 17 Nov order | 400 each time | `api/sprint02/orders.test.ts` | ✅ |
| TC-API-ORD-09 | **Concurrency: last portion** | S02 | API | P1 | US-09 AC5 · BR2 · AC 04-3, 08-2 | 10 employees order the last 1 portion in parallel | Exactly one 201, nine 409 `OUT_OF_STOCK`; `remaining` = 0 | `api/sprint02/orders.test.ts` (must pass 5 runs in a row) | ✅ |
| TC-API-ORD-15 | Closed day | S02 | API | P2 | BR5 · US-08 AC5 · AC 03-4 | Order for a Saturday or a closed date | 422 `CANTEEN_CLOSED` | `api/sprint02/orders.test.ts` | ✅ |
| TC-API-ORD-16 | Slot full | S02 | API | P1 | US-19 AC1/AC2 · AC 04-2 | capacity 2; 2 orders in 13:00; a 3rd order | 409 `SLOT_FULL`; slots API shows `available:false` | `api/sprint02/orders.test.ts` | ✅ |
| TC-U-01 | Ordering open before cut-off | S02 | Unit | P1 | US-09 AC1 · BR1 · AC 03-1 | date 17 Nov, now 10:59:59 IST | `true` | `api-u/sprint02.rules.test.ts` | ✅ |
| TC-U-02 | Ordering closed exactly at cut-off | S02 | Unit | P1 | US-09 AC2/AC3 · BR1 · AC 03-1 | now 11:00:00 IST | `false` | `api-u/sprint02.rules.test.ts` | ✅ |
| TC-U-03 | Order date window: today and tomorrow only | S02 | Unit | P1 | US-09 AC10 · AC 03-1 | now 16 Nov 23:00 IST; dates 16, 17, 18 Nov, and 15 Nov | 16 → closed (past cut-off), 17 → open, 18 → rejected (day after tomorrow), 15 → rejected | `api-u/sprint02.rules.test.ts` | ✅ |
| TC-U-04 | IST/UTC boundary | S02 | Unit | P1 | A11 · BR1 · AC 03-1 | `2026-11-17T05:29:59Z` and `05:30:00Z`; `2026-11-16T18:31:00Z` | open / closed; "today" = 17 Nov (IST) | `api-u/sprint02.rules.test.ts` | ✅ |
| TC-U-05 | Slot generation | S02 | Unit | P2 | US-09 · AC 03-1 | 12:30–14:30, 15 min | 8 slots; first 12:30–12:45; last 14:15–14:30 | `api-u/sprint02.rules.test.ts` | ✅ |
| TC-U-06 | Slot validation | S02 | Unit | P1 | US-09 AC8 · AC 03-1 | `12:10`, `14:30`, `12:15`, `13:00` | false, false, false, true | `api-u/sprint02.rules.test.ts` | ✅ |
| TC-U-10 | Pickup code generator | S02 | Unit | P2 | BR8 · AC 04-3 | Generate 5,000 codes | All 6 chars from `[A-HJ-NP-Z2-9]`; generated with `crypto.randomInt` | `api-u/sprint02.rules.test.ts` | ✅ |
| TC-UI-06 | **Golden path end to end** (employee part) | S02 | UI | P1 | US-09 AC1 · US-11 AC1/2 · US-12 AC2/3 · US-13 AC2/3 · AC 04-4, 05-1 | Employee orders 1 Veg Biryani for slot 13:00 → sees the QR and code → staff (2nd context) Start → Ready → enters the code → Hand over → employee reloads (project: desktop + mobile) | Statuses progress correctly; the employee sees **COLLECTED**; the dashboard count goes up by 1 | `e2e/sprint02/ordering.spec.ts` | ✅ |
| EC-02-01 | Quantity exactly 5 (max) | S02 | API | P2 | — | Input as in the title | 201 | `api/sprint02/orders.test.ts` | ✅ |
| EC-02-02 | Order at 10:59:59 | S02 | API | P2 | — | Input as in the title | 201 | `api/sprint02/orders.test.ts` | ✅ |
| EC-02-03 | Tomorrow after today's cut-off | S02 | API | P2 | — | Input as in the title | 201 | `api/sprint02/orders.test.ts` | ✅ |
| EC-02-04 | STAFF / MANAGER / ADMIN place an order | S02 | API | P2 | — | Input as in the title | 403 | `api/sprint02/orders.test.ts` | ✅ |
| EC-02-05 | Another user reuses an Idempotency-Key | S02 | API | P2 | — | Input as in the title | never returns the first user's order | `api/sprint02/orders.test.ts` | ✅ |
| EC-02-06 | Date with no published menu | S02 | API | P2 | — | Input as in the title | 422 `MENU_NOT_PUBLISHED` | `api/sprint02/orders.test.ts` | ✅ |
| EC-02-07 | Unknown `dailyMenuItemId` | S02 | API | P2 | — | Input as in the title | 400 | `api/sprint02/orders.test.ts` | ✅ |
| EC-02-08 | First (12:30) and last (14:15) slot | S02 | API | P2 | — | Input as in the title | 201 | `api/sprint02/orders.test.ts` | ✅ |
| EC-02-09 | Two items, one out of stock | S02 | API | P2 | — | Input as in the title | 409, **no** stock deducted for either | `api/sprint02/orders.test.ts` | ✅ |
| EC-02-10 | Odd prices (3 × 3333 + 2550) | S02 | API | P2 | — | Input as in the title | exact integer `totalPaise` | `api/sprint02/orders.test.ts` | ✅ |
| EC-02-11 | Slot capacity 1, 5 parallel orders | S02 | API | P2 | — | Input as in the title | exactly one 201 | `api/sprint02/orders.test.ts` | ✅ |
| EC-02-12 | 25 orders | S02 | API | P2 | — | Input as in the title | 25 distinct pickup codes | `api/sprint02/orders.test.ts` | ✅ |
| EC-02-14 | Order endpoints without a session | S02 | API | P2 | — | Input as in the title | 401 | `api/sprint02/orders.test.ts` | ✅ |
| EC-02-U1 | Slot lengths 10/20/30 min | S02 | Unit | P2 | — | Input as in the title | 12 / 6 / 4 slots | `api-u/sprint02.rules.test.ts` | ✅ |
| EC-02-U2 | Window not a multiple of the slot length | S02 | Unit | P2 | — | Input as in the title | partial last slot dropped | `api-u/sprint02.rules.test.ts` | ✅ |
| EC-02-UI1 | Place order before choosing a slot | S02 | UI | P2 | — | Input as in the title | button disabled | `e2e/sprint02/ordering.spec.ts` | ✅ |
| EC-02-20 | A cancelled order frees its slot place | S02 | API | P2 | — | Capacity 1: order, second user blocked, first cancels, second retries | 409 then 201 | `api/sprint02/probes.test.ts` | ✅ |
| EC-02-22 | Buy exactly what is left | S02 | API | P2 | — | 3 left, order 3, then another order 1 | 201, then 409 "sold out" | `api/sprint02/probes.test.ts` | ✅ |
| EC-02-23 | Price snapshot on the order (BR6) | S02 | API | P2 | — | Order at ₹120, change price to ₹150, read order | order still 12000 paise | `api/sprint02/probes.test.ts` | ✅ |
| EC-02-24 | Array body, string qty, 11 items, wrong date format | S02 | API | P2 | — | POST /api/orders with each body | 400 VALIDATION_ERROR | `api/sprint02/probes.test.ts` | ✅ |
| EC-02-UI9 | Full slot disabled; Place order waits for a slot | S02 | UI | P2 | — | Slots: 12:30 full, 13:00 open | 12:30 radio disabled "Full · 30/30"; button enabled only after choosing 13:00 | `web/test/sprint02-probes.test.tsx` | ✅ |
| EC-02-UI10 | Inline errors: out of stock, cut-off, slot full; Idempotency-Key sent | S02 | UI | P2 | — | POST returns each 409 | alert with the fix ("Reduce the quantity", "Try ordering for tomorrow", "Pick another"); header is a UUID | `web/test/sprint02-probes.test.tsx` | ✅ |
| EC-02-UI11 | Empty cart at checkout | S02 | UI | P2 | — | Open checkout with no items | "Your cart is empty" + Go to menu | `web/test/sprint02-probes.test.tsx` | ✅ |
| EC-03-23 | Checkout: clock unavailable shows an error and retries (BUG-03-002 regression) | S03 | UI | P2 | — | /api/time 500 on /menu/checkout; click Try again | error + "Try again"; the clock is read again | `web/test/server-clock.test.tsx` | ✅ |
