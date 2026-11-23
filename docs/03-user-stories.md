# Stage 3 — User Stories & Acceptance Criteria

Format: **As a** _role_ **I want** _capability_ **so that** _benefit_. Acceptance criteria (AC) are written in **Given / When / Then**. Each story lists its features (`Mxx`/`Sxx`) and its business rules (`BRx`). Negative and edge cases are marked **(neg)** and **(edge)**.

Default data used in the examples: cut-off **11:00 IST**, slots **12:30–14:30** every 15 min, max qty per item **5**, allowed domains **@rubicotech.com** and **@rubicotech.in**.

### Coverage of Must features

| Feature | Stories |
|---|---|
| M01 | US-01, US-02 |
| M02 | US-03 |
| M03 | US-04 |
| M04 | US-05 |
| M05 | US-06 |
| M06 | US-07 |
| M07 | US-08 |
| M08 | US-09 |
| M09 | US-10 |
| M10, M11 | US-11 |
| M12 | US-12 |
| M13 | US-13 |
| M14 | US-14 |
| M15 | US-15 (plus the validation ACs inside each story) |
| M16 | US-16 |
| M17 | US-19 (promoted from Should in v2) |

---

## Epic A — Access & Accounts

### US-01 · Sign up with company email `M01` `BR10`
**As an** employee **I want** to create an account with my company email **so that** I can pre-order lunch.

| AC | Given | When | Then |
|---|---|---|---|
| AC1 | I am on the sign-up page | I submit name "Priya Sharma", email `priya@rubicotech.com`, password `Lunch2026` | My account is created with role **EMPLOYEE**, I am logged in and taken to "Today's Menu" |
| AC2 **(neg)** | Email `priya@gmail.com` | I submit the form | I see "Use your company email (@rubicotech.com or @rubicotech.in)" and no account is created (API `403 DOMAIN_NOT_ALLOWED`) |
| AC3 **(neg)** | `priya@rubicotech.com` already exists | I submit the form | I see "An account with this email already exists" (`409 EMAIL_EXISTS`) |
| AC4 **(neg)** | Password `abc` | I submit the form | I see "Password must be 8–64 characters with at least one letter and one number" |
| AC5 **(edge)** | Email `  Priya@Rubicotech.COM ` | I submit the form | The email is trimmed and lower-cased before saving; a duplicate check against `priya@rubicotech.com` succeeds |
| AC6 (security) | An account was created | I inspect the database | The password is stored as a bcrypt hash (`$2b$12$…`), never in plain text |

### US-02 · Log in and log out `M01` `BR11` `BR12`
**As a** registered user **I want** to log in and out securely **so that** only I can use my account.

| AC | Given | When | Then |
|---|---|---|---|
| AC1 | Valid credentials | I log in | I land on the home page for my role (Employee → Menu, Staff → Queue, Manager → Dashboard, Admin → Users), and an httpOnly, SameSite=Lax session cookie is set |
| AC2 **(neg)** | Wrong password | I log in | I see "Invalid email or password". The message does not reveal whether the email exists (`401`) |
| AC3 **(neg)** | 5 failed attempts in 15 min | I try a 6th time, even with the correct password | I see "Too many attempts. Try again in 15 minutes" (`429`) |
| AC4 **(neg)** | My account is deactivated | I log in | I see "Your account is disabled. Contact the admin" (`403`) |
| AC5 | I am logged in | I click Logout | The session cookie is cleared, and pressing Back or opening `/orders` sends me to the login page |
| AC6 **(edge)** | My session is older than 8 hours | I call any API | I get `401` and the UI sends me to login with a "Session expired" message |

### US-03 · Role-based access `M02`
**As the** system owner **I want** each role to see and do only what it is allowed to **so that** data and operations stay safe.

| AC | Given | When | Then |
|---|---|---|---|
| AC1 | I am an EMPLOYEE | I view the navigation | I see only Menu, My Orders and Profile |
| AC2 **(neg)** | I am an EMPLOYEE | I open `/manager/menu` directly or call `POST /api/menu-items` | The page shows "Not authorised", and the API returns `403 FORBIDDEN` |
| AC3 **(neg)** | I am STAFF | I call `PUT /api/settings` | `403 FORBIDDEN` |
| AC4 **(neg)** | I am an EMPLOYEE | I call `GET /api/orders/{id}` for another employee's order | `404 NOT_FOUND`. The order's existence is not revealed |
| AC5 **(neg)** | I am not logged in | I call any API except signup, login and health | `401 UNAUTHENTICATED` |
| AC6 **(edge)** | My role was changed from MANAGER to EMPLOYEE while I was logged in | I make my next request | The new role applies straight away (the role is read from the DB on each request, not trusted from the cookie) |

### US-04 · Admin manages users `M03`
**As an** admin **I want** to change roles and deactivate users **so that** the right people have the right access.

| AC | Given | When | Then |
|---|---|---|---|
| AC1 | I am ADMIN on the Users page | I search "ramesh" | Matching users are listed (name, email, role, status) with pagination of 20 per page |
| AC2 | User Ramesh is EMPLOYEE | I change his role to MANAGER | His role is saved, and a success message is shown |
| AC3 | A user is active | I deactivate them | Their status is "Disabled", and they can no longer log in (US-02 AC4) |
| AC4 **(neg)** | I am the **only** ADMIN | I try to change my own role or deactivate myself | I see "At least one active admin is required" (`409 LAST_ADMIN`) |
| AC5 **(neg)** | The user ID does not exist | I PATCH `/api/users/9999` | `404 NOT_FOUND` |

### US-05 · Admin configures canteen settings `M04`
**As an** admin **I want** to set the cut-off, pickup window and limits **so that** the system follows company rules.

| AC | Given | When | Then |
|---|---|---|---|
| AC1 | I am ADMIN | I set cut-off 10:30, slots 12:00–14:00, slot length 15, max qty 3, closed weekdays Sat and Sun | The settings are saved, and the new rules apply to new orders straight away |
| AC2 **(neg)** | The slot start is after the slot end | I save | I see "Pickup window end must be after start" |
| AC3 **(neg)** | The cut-off is later than the slot start (e.g. cut-off 12:30, slots from 12:00) | I save | I see "Cut-off must be before the first pickup slot" |
| AC4 **(neg)** | Slot length 7 | I save | I see "Slot length must be 10, 15, 20 or 30 minutes" |
| AC5 **(edge)** | Orders already exist for today | I change the cut-off | Existing orders are not changed; only new orders and cancellations use the new cut-off |

---

## Epic B — Menu

### US-06 · Manager maintains menu items `M05`
**As a** canteen manager **I want** to add and edit dishes **so that** I can build each day's menu quickly.

| AC | Given | When | Then |
|---|---|---|---|
| AC1 | I am MANAGER | I add "Paneer Butter Masala", category Main, price ₹120.00, veg | The item appears in the catalogue; the price is stored as 12000 paise |
| AC2 **(neg)** | Price is `0`, `-5`, `abc` or `10.999` | I save | I see "Price must be between ₹1 and ₹1,000 with at most 2 decimals" |
| AC3 **(neg)** | The name is empty or longer than 80 characters | I save | I see a field error |
| AC4 **(neg)** | An active item called "Veg Biryani" already exists | I add another "veg biryani" | I see "An item with this name already exists" (case-insensitive) |
| AC5 **(edge)** | An item is on today's menu and has orders | I edit its price | Existing orders keep their old price (BR6); new orders use the new price |
| AC6 | An item is no longer served | I archive it | It is hidden from daily-menu selection, but old orders still show its name |

### US-07 · Manager sets the daily menu and quantities `M06` `BR9`
**As a** canteen manager **I want** to choose which dishes are served on a date and how many portions **so that** employees can order only what I can cook.

| AC | Given | When | Then |
|---|---|---|---|
| AC1 | I am MANAGER | I set tomorrow's menu: Veg Biryani 80, Dal Tadka 60, Curd Rice 40 | Employees see these 3 items for tomorrow with the remaining quantity shown |
| AC2 **(neg)** | 25 Veg Biryani are already ordered today | I set today's Veg Biryani quantity to 20 | I see "Quantity can't be lower than already ordered (25)" (`409 QTY_BELOW_ORDERED`) |
| AC3 **(neg)** | Quantity is `0` for a new entry, a negative number or a non-integer | I save | I see "Quantity must be a whole number from 1 to 1000" |
| AC4 **(edge)** | The same item is selected twice in one request | I save | `400 VALIDATION_ERROR` "Duplicate item in menu" |
| AC5 **(neg)** | The date is in the past | I try to edit its menu | `400` "Cannot change menu for a past date" |

### US-08 · Employee views today's menu `M07`
**As an** employee **I want** to see today's menu with what is still available **so that** I can decide before going to the canteen.

| AC | Given | When | Then |
|---|---|---|---|
| AC1 | Today's menu is published | I open Menu | I see each item with name, price (₹), veg/non-veg badge and "N left" |
| AC2 | Veg Biryani has 0 left | I view the menu | It shows **Sold out** and its Add button is disabled |
| AC3 | It is after the cut-off | I open Menu | I see "Ordering for today closed at 11:00", and a tab for tomorrow is shown |
| AC4 **(edge)** | No menu is published for the date | I open Menu | I see "Menu not published yet" instead of an empty list |
| AC5 **(edge)** | The date is a closed day (weekend or holiday) | I open Menu | I see "Canteen closed on this day" |

---

## Epic C — Ordering

### US-09 · Employee places a pre-order `M08` `BR1–BR6`
**As an** employee **I want** to order my lunch and choose a pickup time **so that** it is ready when I arrive.

| AC | Given | When | Then |
|---|---|---|---|
| AC1 | It is 10:15, Veg Biryani has 10 left, and I have no order today | I add 2 Veg Biryani, choose slot 13:00–13:15 and confirm | The order is created with status **PLACED**, total ₹240.00, a 6-character pickup code, and "Veg Biryani: 8 left" |
| AC2 **(neg)** | It is 11:00:00 or later | I confirm | `409 CUTOFF_PASSED`: "Ordering for today closed at 11:00". No order is created |
| AC3 **(edge)** | I opened checkout at 10:59 and confirm at 11:00:05 | I confirm | The server rejects the order with `CUTOFF_PASSED`; the server time is used, not the client time |
| AC4 **(neg)** | Only 1 Veg Biryani is left | I order 2 | `409 OUT_OF_STOCK`: "Only 1 Veg Biryani left". Nothing is deducted |
| AC5 **(edge)** | 1 portion is left and two employees confirm at the same moment | Both requests run | Exactly **one** succeeds; the other gets `OUT_OF_STOCK`; the remaining quantity is 0, never −1 |
| AC6 **(neg)** | I already have an active order today | I place another order | `409 ORDER_EXISTS_FOR_DATE`: "You already have an order for today. Cancel it to order again" |
| AC7 **(neg)** | Quantity 6 (max 5), quantity 0 or an empty cart | I confirm | `400 VALIDATION_ERROR` with a field message; the UI stepper also stops at 1–5 |
| AC8 **(neg)** | The slot "12:10" is not a valid slot boundary, or is outside the window | I confirm | `400` "Choose a valid pickup slot" |
| AC9 **(edge)** | I double-tap Confirm (same `Idempotency-Key`) | Two requests arrive | Only one order is created; the second gets the same order back |
| AC10 **(neg)** | The date is the day after tomorrow or yesterday | I order | `400` "You can order for today or tomorrow only" |
| AC11 **(neg)** | The menu item ID belongs to another date's menu | I order | `400` "Item not on the menu for this date" |

### US-10 · Employee cancels an order `M09` `BR1` `BR7`
**As an** employee **I want** to cancel my order before the cut-off **so that** I am not charged when my plans change.

| AC | Given | When | Then |
|---|---|---|---|
| AC1 | My order is PLACED, and it is 10:40 | I click Cancel and confirm the dialog | The status becomes **CANCELLED**, the quantities go back to stock, and I can place a new order |
| AC2 **(neg)** | It is 11:05 | I try to cancel | `409 CUTOFF_PASSED`: "Orders can't be cancelled after 11:00" and the Cancel button is hidden |
| AC3 **(neg)** | The order is already CANCELLED or COLLECTED | I call cancel | `409 INVALID_STATUS` |
| AC4 **(neg)** | The order belongs to another employee | I call cancel | `404 NOT_FOUND` |

### US-11 · Employee sees order QR and history `M10` `M11`
**As an** employee **I want** to see my orders and a pickup QR code **so that** collecting food is quick.

| AC | Given | When | Then |
|---|---|---|---|
| AC1 | I have an order for today | I open My Orders | I see today's order at the top with status, slot, items, total and a **QR code** plus the code in large text (e.g. `K7Q4MZ`) |
| AC2 | My order is READY | I view it | The status badge shows **Ready for pickup** (the page refreshes every 30 s) |
| AC3 | I have past orders | I scroll the history | Orders are sorted newest first, 10 per page, and each shows date, items, total and final status |
| AC4 (security) | I inspect the QR content | — | It contains only the pickup code, with no name, email or internal database ID |
| AC5 **(edge)** | I have no orders | I open My Orders | I see "No orders yet" and a link to the Menu |

---

## Epic D — Counter operations

### US-12 · Staff manages the order queue `M12` `BR7`
**As** canteen staff **I want** to see today's orders by pickup slot and update their status **so that** food is ready on time.

| AC | Given | When | Then |
|---|---|---|---|
| AC1 | I am STAFF | I open the Queue | I see today's orders grouped by slot, with counts per status, filterable by status |
| AC2 | An order is PLACED | I tap "Start" | It becomes PREPARING |
| AC3 | An order is PREPARING | I tap "Ready" | It becomes READY (and an email is sent if S02 is built) |
| AC4 **(neg)** | Any order | I try to set COLLECTED via `PATCH /status`, or move a CANCELLED order to PREPARING | `409 INVALID_TRANSITION` (collection is only possible through pickup verification, US-13) |
| AC5 **(neg)** | An order is CANCELLED | I view the queue | It is greyed out and has no action buttons |
| AC6 | — | I open the Prep List | I see the total quantity per dish for today (excluding cancelled orders) |

### US-13 · Staff verifies pickup `M13` `BR8`
**As** counter staff **I want** to scan the employee's QR code **so that** I hand over the right order exactly once.

| AC | Given | When | Then |
|---|---|---|---|
| AC1 | Order `K7Q4MZ` is READY today | I scan the QR code | I see the employee's name, items and slot, plus a big **Hand over** button |
| AC2 | I tap Hand over | — | The status becomes **COLLECTED**, and the collection time and staff ID are recorded |
| AC3 | The camera is unavailable | I type `k7q4mz` | Lower-case input is accepted, and the same result as AC1 is shown |
| AC4 **(neg)** | The code is already COLLECTED | I scan it again | A red "Already collected at 13:04" message is shown (`409 ALREADY_COLLECTED`) |
| AC5 **(neg)** | The code is for tomorrow's order | I scan it | "This order is for 18 Nov, not today" (`409 WRONG_DATE`) |
| AC6 **(neg)** | The code is for a CANCELLED order | I scan it | "Order was cancelled" (`409 INVALID_STATUS`) |
| AC7 **(neg)** | The code `ZZZZZZ` does not exist | I scan it | "Code not found" (`404`) |
| AC8 **(edge)** | The order is still PLACED or PREPARING | I scan it | The order is shown with a warning "Not marked ready yet". Staff can still hand it over, which records READY and then COLLECTED |

---

## Epic E — Insights

### US-14 · Manager views the dashboard `M14`
**As a** canteen manager **I want** a daily summary **so that** I can cook the right amount and spot no-shows.

| AC | Given | When | Then |
|---|---|---|---|
| AC1 | Today has 120 orders | I open the Dashboard | I see KPI tiles: Total orders, Revenue (₹), Collected, Pending, Cancelled, No-show |
| AC2 | — | I view "Items to prepare" | It shows a table of dish → quantity ordered / quantity limit, excluding cancelled orders |
| AC3 | — | I view "Orders by slot" | It shows a bar chart of orders per 15-minute slot |
| AC4 | — | I pick another date | All widgets update for that date |
| AC5 **(neg)** | I am an EMPLOYEE | I call `GET /api/reports/dashboard` | `403` |
| AC6 **(edge)** | There are no orders on the date | I open the Dashboard | Tiles show 0, and the charts show "No data" without errors |
| AC7 | I am ADMIN | I open the Dashboard | I see the same data, read-only |

---

## Epic F — Cross-cutting

### US-15 · Clear validation on UI and API `M15`
**As a** user **I want** clear, consistent error messages **so that** I know how to fix my input.

| AC | Given | When | Then |
|---|---|---|---|
| AC1 | Any form | I submit invalid data | The UI shows the error next to the field **before** sending the request (client-side validation with the shared Zod schema) |
| AC2 | The UI is bypassed (e.g. curl or Postman) | I send invalid data | The API returns `400` with `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": { "<field>": "<msg>" } } }` |
| AC3 **(neg)** | Malformed JSON body | I send the request | `400 INVALID_JSON`; no stack trace is returned |
| AC4 (security) | Name contains `<script>alert(1)</script>` | It is saved and displayed | It is shown as text and never executed (React escapes output) |
| AC5 **(neg)** | An unexpected server error happens | — | `500 INTERNAL_ERROR` with a generic message; details are logged on the server only |

### US-16 · Works on a mobile screen `M16`
**As an** employee on my phone **I want** the app to fit my screen **so that** I can order on the move.

| AC | Given | When | Then |
|---|---|---|---|
| AC1 | Viewport 360×740 | I open Menu, Checkout and My Orders | There is no horizontal scrolling; buttons are at least 44 px tall; navigation collapses into a bottom bar or menu |
| AC2 | Viewport 768 px (tablet, staff) | I open the Queue | Slot groups are shown in 2 columns |
| AC3 | Viewport 1280 px | I open the Dashboard | KPI tiles appear in one row with charts side by side |

---

## Should-have stories *(and US-19, now Must)*

### US-17 · CSV export `S01`
| AC | Given | When | Then |
|---|---|---|---|
| AC1 | I am MANAGER or ADMIN | I export orders for 1–30 Nov | A file `orders_2026-11-01_2026-11-30.csv` downloads with columns: date, order_id, pickup_code, employee_name, employee_email, items, total_inr, status, slot |
| AC2 **(neg)** | The range is more than 92 days, or `from > to` | I export | `400` "Date range must be 1–92 days" |
| AC3 (security) | An employee name starts with `=`, `+`, `-` or `@` | It is exported | The cell is prefixed with `'` to prevent CSV/formula injection |

### US-18 · Email notifications `S02`
| AC | Given | When | Then |
|---|---|---|---|
| AC1 | I place an order | It is confirmed | I receive an email with the items, slot and pickup code |
| AC2 | Staff mark my order READY | — | I receive a "Your lunch is ready" email |
| AC3 **(edge)** | The email provider is down | An order is placed | The order still succeeds; the email failure is logged (sending email never blocks ordering) |

### US-19 · Slot capacity `M17` *(promoted from Should S03 in v2)*
| AC | Given | When | Then |
|---|---|---|---|
| AC1 | Slot capacity is 25 and 13:00 has 25 orders | I open checkout | The 13:00 slot is shown as **Full** and cannot be selected |
| AC2 **(edge)** | Two users take the last place in a slot at the same moment | — | One succeeds; the other gets `409 SLOT_FULL` |

### US-20 · Auto no-show `S04`
| AC | Given | When | Then |
|---|---|---|---|
| AC1 | An order for slot 13:00–13:15 is still READY at 13:46 (grace 30 min) | The scheduled job runs | The status becomes **NO_SHOW** |
| AC2 | The order was COLLECTED | The job runs | It is unchanged |
