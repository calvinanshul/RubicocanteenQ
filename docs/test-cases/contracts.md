# Contracts the automated scripts rely on

Scripts for sprints 2–4 were written before the code. They rely on the module names, API details and UI selectors below.
If the implementation needs something different, sprint-development marks the bug `disputed`; sprint-testing then updates the script **and** this file together.
Back to [all test cases](TEST-CASES.md).

## Sprint 02 · Order Lunch

**Modules (unit scripts)**
- `backend/src/services/rules.ts`:
  - `isOrderingOpen(date, now, { orderCutoff })`
  - `isValidOrderDate(date, now)`: true for today and tomorrow (IST), false otherwise
  - `generateSlots({ slotStart, slotEnd, slotMinutes })` → `{ start, end }[]`
  - `isValidSlot(slotStart, settings)`
- `backend/src/services/pickupCode.ts`: `generatePickupCode()`, using `crypto.randomInt` and never `Math.random`.

**API:** O1–O5 and M6 exactly as in [`05-api-spec.md`](../05-api-spec.md):
- The O1 response includes `id, status, date, slotStart, slotEnd, pickupLocation, createdAt, pickupCode, totalPaise, items[{ name, qty, unitPricePaise }]`.
- O4 sends `Cache-Control: private`.
- When the date has no menu at all, `MENU_NOT_PUBLISHED` (422) takes precedence over "item not on the menu" (400).

**UI contract (E2E selectors)**
| Element | Accessible name / selector |
|---|---|
| Day switch | `role=tab` named `Today` / `Tomorrow` |
| Dish card | `<article aria-label="{dish name}">` |
| Add / sold out | button `Add`; sold out shows text `Sold out` + disabled button `Unavailable`; scarce shows `Only N left` |
| Stepper | buttons `Increase {dish}` / `Decrease {dish}`; count element labelled `Quantity of {dish}` |
| To checkout | button `Checkout` (mobile tray) or `Choose pickup slot` (desktop panel) |
| Slots | `role=radio`, name starts with the start time (e.g. `13:00–13:15 · 12 left`) |
| Submit | button whose name starts with `Place order` (disabled until a slot is chosen) |
| Pass | heading `Order confirmed`; `data-testid="pickup-code"`; `<img alt="Pickup QR code">` ≥ 180 px; text containing "monthly … statement" |
| Cancel | button `Cancel order` → dialog text "The items go back on the menu" → button `Yes, cancel order`; status text `Cancelled` |
| Closed | banner `Ordering for today closed at 11:00`. The UI takes "closed" from the API's `orderingOpen`, so the test clock drives it |
| Already ordered | banner containing `You already have an order` |

## Sprint 03 · Counter & Kitchen

**Modules:** `backend/src/services/orderStatus.ts`:
- `canTransition(from, to): boolean`
- `assertTransition(from, to)`: throws when the transition isn't allowed

Allowed transitions: PLACED→PREPARING/CANCELLED/NO_SHOW/COLLECTED, PREPARING→READY/NO_SHOW/COLLECTED, READY→COLLECTED/NO_SHOW. The direct →COLLECTED transitions are the hand-over-with-warning path, and they are only reachable through Q4.

**API:** Q1–Q4, R1 and R2 as in [`05-api-spec.md`](../05-api-spec.md), plus:
- **Q1** returns `slots[].orders[]` with `pickupCode, employeeName, department, status, items`, plus `counts` and `lastUpdated`. `status=` filters, and an unknown status returns 400.
- **Q3** response: `{ order, warning }`. The code is trimmed and upper-cased, then checked against `[A-HJ-NP-Z2-9]{6}` (400 if it doesn't match).
- **R1 counting rules:**
  - `orders` counts all orders, including cancelled ones.
  - `revenuePaise` covers every order except cancelled ones.
  - `pending` = PLACED + PREPARING + READY.
  - `avgOrderPaise` = `revenuePaise / orders`.
  - `items[].ordered` and `slots[].count` exclude cancelled orders.
  - `vsYesterdayPct` compares with the previous working day, and is `null` when that day had no orders.
  - `peakSlot` is the slot with the most non-cancelled orders; a tie goes to the earliest slot; `null` when there are no orders.
- **R1 and R2 access:** R1 is MANAGER and ADMIN only (STAFF gets 403). R2 is STAFF and MANAGER.

**UI contract (E2E selectors)**
| Element | Accessible name / selector |
|---|---|
| Queue ticket | `<article aria-label="Order {CODE}">` with buttons `Start preparing` / `Mark ready`; READY shows `Ready` and no button; cancelled shows `Cancelled` and **no buttons** |
| Scan | input labelled `Pickup code`, button `Find`, result button named like `HAND OVER`; success text `Handed over`; errors in `role=alert`: `Already collected at …`, `This order is for …`, `This order was cancelled`, `Code not found` |
| Employee pass | shows `Collected` after hand-over (on reload or poll) |
| Dashboard | tile labels `Total orders`, `Revenue`, `Collected`, `Pending`, `Cancelled`, `No-show`; collected tile `data-testid="kpi-collected"`; date input labelled `Date`; empty text `No orders for this date` |
| Prep list | dish names and a `Print` button |

## Sprint 04 · Run the Canteen & Release

**Modules:** `backend/src/adapters/csv.ts`:
- `toCSV(rows, columns): string`: header row first. A cell starting with `= + - @` (or tab/CR + one of those) gets a `'` prefix. Cells are quoted per RFC 4180. `null` and `undefined` become empty.

**API:** M1–M3, U1–U2, S1–S5, O2, R3–R4 and X2 as in [`05-api-spec.md`](../05-api-spec.md), plus:
- **U1:** `page` must be ≥ 1 and an unknown `role` returns 400.
- **R3** header: `date,order_id,pickup_code,employee_name,employee_email,items,total_inr,status,slot`. The range is inclusive, so 92 days is OK and 93 is not.
- **R4** header: `employee,employee_code,department,email,orders,total_inr`. It bills COLLECTED, NO_SHOW and other non-cancelled orders, and never CANCELLED ones.
- **S4:** a duplicate date returns 409. **S5:** a missing date returns 404.
- **X2:** `Authorization: Bearer $CRON_SECRET`, and it honours the test clock.

**UI contract (E2E selectors)**
| Element | Accessible name / selector |
|---|---|
| Catalogue | button `Add item`; table cells contain the dish name |
| Item dialog | `role=dialog` with fields `Dish name`, `Description`, `Category` (select, values = enum), `Price (₹)` (rupees), radios `Veg` / `Non-veg` / `Jain`; submit button `Save`; error text `Price must be between ₹1 and ₹1,000…` |
| Users | search input `Search users`; per-row select `Role for {name}`; confirm dialog button `Confirm`; toast containing `Role updated` |
| Exports | buttons `Download CSV` (orders card first) |
| My orders | empty text `No orders yet` with link `Go to menu` |
| 404 | `We couldn't find that page` |
