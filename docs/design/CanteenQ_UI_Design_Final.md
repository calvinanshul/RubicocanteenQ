# Stage 5f — Final UI Design Specification (Fresh Counter)

| | |
|---|---|
| **Status** | ✅ **Final**: approved for build (v1.0, 18 Nov 2026) |
| **Design source** | Stitch "Fresh Counter" design system (`docs/design/fresh_counter/DESIGN.md`) + 4 Stitch screens (`docs/design/`) |
| **Full mockups** | Design canvas **"CanteenQ — Fresh Counter Mockups (All Screens)"**: <https://claude.ai/artifact/SV2cTvELJACNeMiyBUBEqp> (23 screens, 5 pages, clickable in Play mode) |
| **Related** | Requirements + design decisions D1–D21 (`02-requirements.md §6.1`) · Stories (`03`) · API (`05-api-spec.md`) · Build tasks (`06-build-tasks.md`, FE-01..FE-98) |

This document is the **single reference for building the frontend**. Where the mockups and this document disagree, this document wins. Raise a change in the requirements change log first.

---

## 1. Design principles

1. **Mobile-first for employees and staff; desktop for manager and admin.** Employees also get a full desktop layout.
2. **Time is always visible.** The cut-off countdown and pickup slot appear on every ordering screen.
3. **Honest scarcity.** Always show "N left", "Only 3 left" and "Sold out". You can't add what isn't available.
4. **Counter screens are readable at arm's length:** large mono codes and numbers, one big action per screen.
5. **Errors say what to do next**, next to the field or as a banner, never only in a toast.
6. **No payment step.** Every order says "Added to your monthly canteen statement".
7. **Warm and calm:** cream canvas, white cards, one terracotta accent. No gradients, no emoji, no photos in the MVP.

---

## 2. Design tokens

### 2.1 Colour

| Token | Hex | Use |
|---|---|---|
| `surface-cream` | `#FBF6EF` | App background (canvas) |
| `surface-card` | `#FFFFFF` | Cards, tables, inputs |
| `surface-card-warm` | `#FFFDF9` | Tickets, order items, highlighted rows |
| `border-sand` | `#F3E8DC` | Card borders, dividers, stepper background |
| `border-sand-strong` | `#EAD7C5` | Input borders, tickets, selected cards |
| `text-primary` | `#2B211B` | Main text, dark buttons, avatars of staff roles |
| `text-secondary` | `#6E5D53` | Descriptions, labels, meta text |
| `primary` | `#C2410C` | Primary buttons, active nav, selected chips/slots, prices |
| `primary-hover` | `#EA580C` | Button hover |
| `primary-active` | `#9A3412` | Button pressed; dark text on tints |
| `primary-tint` | `#FFF1EA` | Tinted buttons, info banners, active nav (top bar) |
| `primary-fixed` | `#FFDBD0` | Tint borders |
| `veg` / `veg-bg` | `#15803D` / `#F0FDF4` | Veg marker, READY / success |
| `non-veg` | `#7C2D12` | Non-veg marker |
| `warning-bg` / `-border` / `-text` | `#FEF3C7` / `#FDE68A` / `#92400E` | "Only 3 left", PREPARING, notices |
| `error` / `error-bg` / `error-text` | `#BA1A1A` / `#FFDAD6` / `#93000A` | Field errors, NO_SHOW, sold-out pill |
| Chart bar (normal) | `#F0A684` | Slot bars on the dashboard |

**Contrast rule:** all text pairs above meet WCAG AA (4.5:1). White on `primary` ≈ 5.2:1; `warning-text` on `warning-bg` ≈ 7:1.

### 2.2 Typography

| Token | Font | Size / line | Weight | Use |
|---|---|---|---|---|
| `headline-xl` | Plus Jakarta Sans | 36/44 (28/36 mobile) | 700 | Page titles (desktop) |
| `headline-lg` | Plus Jakarta Sans | 24–30/32–38 | 700 | Screen titles |
| `headline-md` | Plus Jakarta Sans | 18–20/28 | 600 | Card and section titles |
| `headline-sm` | Plus Jakarta Sans | 16/24 | 600 | Dish names, row titles |
| `body-lg` / `body-md` / `body-sm` | Plus Jakarta Sans | 16/24 · 14/20 · 12/16 | 400 | Body, descriptions, meta |
| `label-lg` / `label-md` | Plus Jakarta Sans | 14/20 · 12/16 | 600 / 500 | Buttons, chips, table headers |
| `ticket-code-lg` | JetBrains Mono | 32/36, letter-spacing 8 px | 700 | Pickup code on the pass |
| `ticket-code-sm` | JetBrains Mono | 14/18 | 600–700 | Prices, slots, counts, order IDs |
| `big-number` | JetBrains Mono | 32–52 | 700 | KPI tiles, prep list |

**Rule:** anything numeric that changes live (prices, times, codes, counts) uses **JetBrains Mono**, so layouts don't shift.

### 2.3 Shape, spacing, elevation, icons

| Token | Value |
|---|---|
| Radius | buttons/inputs **8 px** · tiles 12 px · cards **16 px** · dialogs 20 px · chips/badges **pill (999 px)** |
| Spacing scale | 4 · 8 · 12 · 16 · 20 · 24 · 32 px (8 pt grid with 4 pt half-steps) |
| Elevation L1 (cards) | `0 2px 4px rgba(43,33,27,0.04)` + 1 px `border-sand` |
| Elevation L3 (cart tray, dialogs, sticky bars) | `0 16px 24px -4px rgba(43,33,27,0.12)` |
| Icons | **Material Symbols Outlined**, 20–24 px; filled variant for active nav; always `aria-hidden` with a text label or `aria-label` |
| Touch targets | ≥ **44 × 44 px**; counter actions ≥ **56 px** tall |

### 2.4 Breakpoints and grids

| Name | Width | Grid | Who |
|---|---|---|---|
| Mobile | < 768 px (design at **390**) | 4 col, 16 px margin, 12 px gutter | Employee, staff scan |
| Tablet | 768–1024 px (design at **1024**) | 8 col, 24 px margin | Staff queue, prep list |
| Desktop | ≥ 1025 px (design at **1440**) | 12 col, max content **1180–1240 px**, 28–32 px margin | Manager, admin, employee desktop |

---

## 3. Shared components

| Component | Spec | Variants / states | Used on |
|---|---|---|---|
| **Button** | 44 px (48–60 for main CTAs), 8 px radius, `label-lg`, optional leading icon | primary (terracotta) · secondary (white + sand-strong border) · tint (primary-tint + primary-fixed border) · ghost · danger (white + error border) · dark · disabled (sand bg) · loading | All |
| **Input / Select / Textarea** | 44 px, white, 1 px `border-sand-strong`, label above, optional leading icon | focus: 1.5 px primary + 3 px sand ring · error: 1.5 px error border + message with icon below · hint text · disabled (cream bg) | Forms |
| **Diet marker (FSSAI)** | 16×16, 2 px radius, 1.5 px border, white bg | Veg: green dot (6 px) · Non-veg: brown triangle (7–8 px) · Jain uses the veg marker | Every dish |
| **Dish tile** | Rounded square (44–72 px) with initials + category label, colour per dish | MAINS, COMBO, LIGHT, SIDE, DESSERT, DRINK | Menu, catalogue, editor, prep list |
| **Dish card** | White card, tile + marker + name + mono price (terracotta) + description + stock line + action | available (`● N left`) · scarce (amber "Only 3 left" pill) · in cart (stepper) · sold out (faded 62%, red "Sold out" pill, disabled "Unavailable") | S3 |
| **Qty stepper** | Pill `border-sand` bg; white "−" and terracotta "+" 36 px buttons; mono count | 0 → "Add" button · 1–4 · max 5 (+ disabled) | S3, desktop cart |
| **Status badge** | Pill with icon | PLACED (tint/terracotta) · PREPARING (amber, skillet) · READY (green, check) · COLLECTED (sand) · CANCELLED (grey) · NO_SHOW (red) | Orders everywhere |
| **Pill / chip** | Pill, 12–14 px, optional mono and count | filter chip default/selected · count pill · info pill | Filters, tabs |
| **Segmented tabs** | Sand track, terracotta selected segment with icon | Today / Tomorrow · slot length | S3, S15 |
| **Slot button** | 72 px card, mono time range, status line | available (`N left`) · selected (terracotta, check, "Your slot") · full (dashed, struck-through, "Full · 30/30") | S4 |
| **Ticket** | `surface-card-warm`, 1.5 px `border-sand-strong`, **dashed separators** between header / items / footer | pass ticket · staff order ticket (with action) · scan result | S5, S7, S8 |
| **Status stepper** | 4 steps Placed → Preparing → Ready → Collected; done = green check, current = larger with ring, todo = sand | — | S5 |
| **KPI tile** | White card, label + icon, mono big number, sub-line (trend, %, pill), optional mini bar | — | S10 |
| **Progress bar** | 6–8 px track `border-sand`, fill terracotta (red when sold out) | — | S10, S9 |
| **Data table** | Cream header row (12 px caps labels), sand row dividers, horizontal scroll under min width | default · empty · loading | S10, S11, S13, S14, S6 desktop |
| **Switch** | 40–48 × 24–28, terracotta (green for "Active" user) | on · off · disabled | S12, S13, S14 |
| **Banner / alert** | Icon + bold lead + text, 12 px radius | info (tint) · success (green) · warning (amber) · error (red, `role="alert"`) | Many |
| **Dialog** | 20 px radius, header with tile + title + close, footer on warm bg, scrim `rgba(43,33,27,0.45)` | — | S12 |
| **Avatar** | Initials circle; terracotta for employees, espresso for staff/manager/admin | — | Headers, users table |
| **Wordmark** | Terracotta rounded square with `restaurant` icon + "CanteenQ" (replaces the broken Stitch logo, D21) | — | All shells |

---

## 4. Layout shells

| Shell | Structure | Screens |
|---|---|---|
| **Employee mobile** | Header (wordmark + "Building 4 · Counter A" + avatar) or back header with title · scrolling content · **floating cart tray** (menu only) · **bottom nav** Menu / My Orders (dot when an order is active) / Profile | S1–S6 mobile, S17 |
| **Employee desktop** | **Top bar**: wordmark + location · nav (Menu, My orders) · cut-off countdown pill · cart button with count · name + employee ID + avatar. Content max 1240 px | S3–S6 desktop |
| **Auth desktop** | **Split screen**: terracotta brand panel (tagline + 4 "how it works" lines) · form panel (max 440 px) | S1, S2 desktop |
| **Staff counter** | Top bar: wordmark + "Counter · location" · tabs Queue / Scan / Prep list · clock · big **Scan / Enter code** · avatar | S7, S9 (S8 uses a back header on phone) |
| **Console (manager / admin)** | **Left sidebar** (264 px): wordmark + portal name, service status pill, nav, "Last updated" footer · top bar: date, page actions, user. Sidebar stacks above content under ~900 px | S10–S16 |

**Navigation by role**

| Role | Navigation |
|---|---|
| Employee | Menu · My orders · Profile |
| Staff | Queue · Scan · Prep list |
| Manager | Dashboard · Daily Menu Editor · Menu Catalogue · Orders Queue & Prep · Exports |
| Admin | Dashboard (read-only) · Users & Roles · Settings & Rules · Exports |

---

## 5. Screen specifications

Canvas file names are given so each screen can be opened directly. "Phone" = 390 px, "Tablet" = 1024 px, "Desktop" = 1440 px.

### Employee

#### S1 · Login: phone `Main.dc.html` · desktop `DLogin.dc.html`
- **Content:** wordmark + tagline; card "Welcome back" with **Work email** and **Password** (show/hide); "Forgot password?"; **Log in** (48 px, full width); "New here? Create an account"; desktop adds "Keep me logged in for 8 hours".
- **States shown:** session-expired banner (tint). Other states: invalid credentials (same message for unknown email and wrong password), locked (15 min), disabled account, loading button.
- **Stories:** US-02 · **API:** A2

#### S2 · Sign up: phone `Signup.dc.html` · desktop `DSignup.dc.html`
- **Content:** Full name · Work email · Password (+ live rule checklist: 8–64 chars, letter, number) · Confirm password · **Create account** · link to Log in.
- **States shown:** wrong-domain error under email; failed rule in red. Other: duplicate email, mismatched confirm.
- **Stories:** US-01 · **API:** A1

#### S3 · Today's menu: phone `Menu.dc.html` · desktop `DMenu.dc.html`
- **Content (top to bottom):** Today / Tomorrow tabs · **cut-off card** ("Order before 11:00", mono "42 min left" pill, pickup window 12:30–14:30, location) · filter chips with counts (All 6, Veg 5, Non-veg 1, categories) · **dish cards** (6) · **cart tray** "1 item · ₹120 · Veg Biryani · Checkout →" · bottom nav.
- **Desktop:** greeting title + tabs in one row; window info bar; 2-column dish grid; **"Your order" panel on the right** (stays in view) with stepper, subtotal, total, statement note, **Choose pickup slot**.
- **States shown:** in cart (stepper), scarce (amber), sold out (faded + "Unavailable"). Other: after cut-off banner ("Ordering for today closed at 11:00 → Tomorrow"), menu not published, canteen closed, "You already have an order today → View", skeleton loading.
- **Stories:** US-08, US-09 · **API:** M4, M6

#### S4 · Checkout + pickup slot: phone `Checkout.dc.html` · desktop `DCheckout.dc.html`
- **Content:** back + "Checkout" · progress "Menu → Checkout · Step 2 of 2" + "Closes in 42m" (time to cut-off, D7) · **Order summary** (item, qty, price, statement note with **EMP-8921**, subtotal, **Total ₹120**; no subsidy or tax rows, D6) · **slot picker** (8 slots, 2 columns on phone, 4 on desktop; selected, available with remaining count, **Full · 30/30**) · arrival note using the 30-min grace (D9) · "Your pickup" summary (D10) · **Place order · ₹120 · Slot 13:00** · "You can cancel until 11:00 today".
- **States:** button disabled until a slot is chosen; spinner while sending. Inline errors above the button: out of stock (with item name), cut-off passed, slot just filled.
- **Stories:** US-09, US-19 · **API:** M6, O1

#### S5 · Order pass / QR: phone `OrderPass.dc.html` · desktop `DPass.dc.html`
- **Content:** success icon + "Order confirmed" + date + order #501 · **status stepper** (Ready current) · green "Your lunch is ready! Show this pass at Building 4 · Counter A." · pickup window card + "In 18 mins" · **QR code** (real, from API O4, D12) · backup code **K7Q4MZ** (mono 32 px) + copy button · "Issued to Priya Sharma (email)" · summary ("Placed 10:18 AM", item, payment = monthly statement, total) · amber note "can no longer be changed or cancelled" · "View today's full menu". **No wallet button** (D11).
- **Desktop:** status + summary on the left; **ticket** (window, QR, code, location, order #) on the right.
- **States:** before cut-off the amber note is replaced by **Cancel order** (opens confirm dialog). The status updates every 20 s.
- **Stories:** US-10, US-11 · **API:** O3, O4, O5

#### S6 · My orders: phone `MyOrders.dc.html` · desktop `DMyOrders.dc.html`
- **Content:** today's active order card (READY badge, slot, item, code + QR icon → pass) · "Orders in Nov: 12" and "On statement: ₹1,340" · history (date, items, total, status badge: Collected / Cancelled / No-show) · Load more.
- **Desktop:** history as a **table** (date, items, slot, total, status, collected at) with a month selector; "Order lunch" button.
- **States:** empty state "No orders yet → Go to menu".
- **Stories:** US-11 · **API:** O2

### Canteen staff

#### S7 · Order queue: tablet `StaffQueue.dc.html`
- **Content:** staff top bar · "Today's orders" + "Updates every 15 s" · status chips with counts (All 120, Placed 14, Preparing 6, Ready 14, Collected 82, Issues 4) · **two slot columns**: current slot header in terracotta ("Now serving"), next slot in white · **order tickets** (mono code, name · department, items with diet markers, badge, one action: **Start preparing** / **Mark ready**; READY has no button because it waits for the scan) · cancelled tickets faded and struck through.
- **Stories:** US-12 · **API:** Q1, Q2

#### S8 · Scan / verify pickup: phone `StaffScan.dc.html`
- **Content:** back to queue · **camera viewfinder** (dark, orange corner guides, scan line, "Point the camera at the QR pass") · "Or type the 6-character code" (mono, large) + **Find** · **result ticket** (code, READY badge, name, department, slot, items) · **HAND OVER** (60 px, terracotta).
- **States shown:** error card "Already collected at 13:04". Other errors: wrong day, cancelled, code not found; warning "Not marked ready yet" (hand-over still allowed); success tick then reset.
- **Stories:** US-13 · **API:** Q3, Q4

#### S9 · Prep list: tablet `PrepList.dc.html`
- **Content:** "Prep list · Tue 17 Nov" + "totals exclude cancelled orders" · "Total 227 portions" · **Print** · 3×2 **tiles**: dish tile, marker + name, **big mono number**, "of N portions", progress bar, "N unsold" or **Sold out** (amber tile).
- **Stories:** US-12 AC6 · **API:** R2

### Canteen manager

#### S10 · Dashboard: desktop `Dashboard.dc.html`
- **Content:** header card "Canteen overview" + auto-refresh pill + date, **View prep list**, **Export CSV** · **6 KPI tiles**: Total orders 120 (+14% vs yesterday) · Revenue ₹13,800 (avg ₹115/order) · Collected 90 (75%, bar) · Pending 20 · Cancelled 6 (5%) · No-show 4 · **Items to prepare** (6 rows: marker, name, limit, ordered/limit, "N left"/"Sold out", bar) · **Pickup slots** (busiest-slot callout, 8 bars, busiest highlighted, "Capacity 30 per slot · No full slots") · **Live orders** table (tabs All/Ready/Preparing/Collected/Issues; actions **Verify code** / **Mark ready** / **Start**; no direct "Mark collected", D16) · "Showing 5 of 120 · Open full queue".
- **Removed from Stitch:** stations, terminals, KDS, est. wait, "refunded" (D14, D15, D18).
- **States:** empty date (all 0, "No orders for this date"); admin sees it read-only.
- **Stories:** US-14 · **API:** R1, Q1

#### S11 · Menu catalogue: desktop `MenuCatalogue.dc.html`
- **Content:** title + "10 active dishes · 1 archived" + **Add item** · search · category chips · "Show archived" · table (tile + name + description, category pill, diet, mono price, Active/Archived, edit button). Archived rows faded.
- **Stories:** US-06 · **API:** M1

#### S12 · Edit menu item (dialog): desktop `MenuItemForm.dc.html`
- **Content:** dialog over the catalogue: header (tile, "Edit menu item", "existing orders keep their price") · Dish name · Description (with counter 62/300) · Category select · **Price (₹)** · Diet (Veg / Non-veg / Jain radio cards) · Active switch · footer: **Archive item** (danger) · Cancel · **Save changes**.
- **State shown:** price error "Price must be between ₹1 and ₹1,000". Other: duplicate name.
- **Stories:** US-06 · **API:** M2, M3

#### S13 · Daily menu editor: desktop `DailyMenu.dc.html`
- **Content:** title + **Copy from today** + **Save menu** · date stepper "Wed 18 Nov 2026 [Tomorrow]" · info "Employees can order until Wed 11:00 · 73 portions ordered so far" · table: **On menu** switch, dish, price, **Portions** input, **Already ordered** · side panel: at-a-glance (8 dishes, 450 portions, 7/1 veg/non-veg, 73 ordered), error summary, rules note.
- **State shown:** Chicken Curry 20 portions < 25 ordered → field error + "1 problem to fix before saving". Off rows faded with disabled input.
- **Stories:** US-07 · **API:** M5

#### S16 · Exports: desktop `Exports.dc.html`
- **Content:** two cards: **Orders** (from/to, column list, "About 1,640 orders", Download CSV) and **Monthly statement** (month select, column list incl. employee_code and department, "No-show orders are billed" note, Download CSV) · Recent downloads list.
- **Stories:** US-17 · **API:** R3, R4

### Admin

#### S14 · Users & roles: desktop `AdminUsers.dc.html`
- **Content:** title + explainer · success banner "Role updated. Sunita Devi is now Staff" · search · role chips with counts (All 812, Employees 798, Staff 8, Managers 3, Admins 3) · table: avatar + name + email, employee ID, department, **role select**, **active switch**, joined, edit · pagination "1–20 of 812" · note "At least one active admin is always required".
- **States:** disabled user faded; last-admin error; confirm dialog before role change (pattern as S12).
- **Stories:** US-04 · **API:** U1, U2

#### S15 · Settings & rules: desktop `AdminSettings.dc.html`
- **Content:** four cards: **Ordering** (cut-off 11:00, max qty 5) · **Pickup** (window start/end, slot length 10/15/20/30, orders per slot 30, no-show grace 30, pickup location) · **Access** (allowed domains chips + add) · **Calendar** (closed weekdays Sat/Sun, holidays list + add) · sticky save bar ("1 field needs fixing · 2 unsaved changes", Discard, **Save settings**).
- **State shown:** "Pickup window end must be after start". Other: cut-off after first slot, slot length invalid.
- **Stories:** US-05 · **API:** S1–S5

### Shared

#### S17 · Not authorised (403): phone `NotAuthorised.dc.html`
- **Content:** lock icon, "ERROR 403", "This page isn't for your role", explanation, **Go to my menu** (role home), Log out. The same layout is reused for **404** ("We couldn't find that page") and **unexpected errors** ("Something went wrong. Try again").
- **Stories:** US-03 AC2

---

## 6. Interaction and motion

| Pattern | Rule |
|---|---|
| Live data | Menu stock every 30 s · order status every 20 s · staff queue 15 s · dashboard 30 s (TanStack Query polling) |
| Countdown | Uses the server time offset; turns red under 10 min; at cut-off the menu switches to the "closed" state |
| Double submit | Primary action disables + spinner while sending; orders send an `Idempotency-Key` |
| Confirmations | Dialog for cancel order, change role, disable user, archive dish |
| Feedback | Success toast (bottom on phone, top-right on desktop); errors stay inline; `aria-live` for scan results and toasts |
| Slow request | If a request takes > 1 s, show a loader: a thin progress bar across the top and a small spinner (no text; screen readers hear "Loading…") |
| Motion | 150–200 ms ease-out on hover, press and status change; READY gets a short highlight; respect `prefers-reduced-motion` |

---

## 7. Accessibility checklist

- Text contrast ≥ 4.5:1 (≥ 3:1 for 24 px+); faded sold-out cards keep the name readable and add a text pill.
- Diet is shown by **shape + colour + `aria-label`**; status by **icon + text**.
- Every input has a visible label; errors are linked to their field and announced.
- Tap targets ≥ 44 px; counter actions ≥ 56 px.
- Visible focus ring: 1.5 px terracotta + 3 px sand.
- The QR always has the text code next to it, and a copy button.
- Tables scroll inside their box; nothing scrolls sideways at 360 px.
- Keyboard: tab order follows the visual order; dialogs trap focus and close on Esc.

---

## 8. Sample data used in all mockups

| Item | Value |
|---|---|
| Date / cut-off | Tue 17 Nov 2026 · cut-off 11:00 · pickup 12:30–14:30 in 15-min slots · capacity 30 · grace 30 min |
| Location | Building 4 · Counter A |
| Dishes (price · limit · ordered) | Veg Biryani ₹120 · 80 · 68 · Chicken Curry ₹150 · 30 · 30 (sold out) · Paneer Butter Masala ₹130 · 40 · 40 (sold out) · Dal Tadka + Rice ₹80 · 60 · 19 · Curd Rice ₹60 · 40 · 22 · Masala Chaas ₹25 · 100 · 48 |
| Employee | Priya Sharma · priya@company.com · EMP-8921 · Tech Eng |
| Order | #501 · 1 × Veg Biryani · slot 13:00–13:15 · code **K7Q4MZ** · ₹120 · placed 10:18 |
| Staff / Manager / Admin | Sunita Devi · Ramesh Iyer · Anil Mehta |
| Dashboard | 120 orders · ₹13,800 · avg ₹115 · 90 collected (75%) · 20 pending · 6 cancelled · 4 no-show · +14% vs yesterday · busiest 13:00 (24) |

Seed the demo database with the same values (`BE-15`, `BE-16`), so the live app matches the mockups during the demo.

---

## 9. Differences from the original Stitch export (final decisions)

| Area | Stitch export | Final design |
|---|---|---|
| Logo | Broken image | Text wordmark with icon (D21) |
| Avatars | Photos | Initials (D4) |
| Checkout | Subsidy and tax rows; "12m window"; "Priority Ready · Counter C-04" | Subtotal = Total; countdown to cut-off; "Your pickup · {location}" (D6, D7, D10) |
| Slots | "Tokens expire 10 mins post-window" | Uses the 30-min grace setting (D9) |
| Order pass | Decorative QR; "Veg Dum Biryani"; Wallet button | Real QR; dish names from the order; no wallet (D11, D12) |
| Dashboard | Stations, terminals, KDS, est. wait, "refunded"; "Mark Collected" | Removed; actions are Start / Mark ready / Verify code (D14–D16, D18) |
| Manager nav | "Settings & Rules" | Admin-only (D19) |
| Screens | 4 phone/desktop screens | **23 screens**: all roles, plus desktop for employees |

---

## 10. Screen → build task map

| Screen | Frontend tasks | Backend tasks |
|---|---|---|
| Design system | FE-01..FE-24 | — |
| Shells and nav | FE-25..FE-29, FE-28 (guards) | BE-29 |
| S1, S2 | FE-30, FE-31, FE-32 | BE-26..BE-28 |
| S3 | FE-40..FE-44 | BE-37, BE-39 |
| S4 | FE-50, FE-51 | BE-42, BE-43, BE-46 |
| S5 | FE-55..FE-57 | BE-44, BE-45, BE-47 |
| S6 | FE-58 | BE-45 |
| S7, S8, S9 | FE-60..FE-63 | BE-49..BE-53 |
| S10 | FE-80..FE-82 | BE-60, BE-61 |
| S11, S12, S13 | FE-83..FE-85 | BE-35, BE-36, BE-38 |
| S16 | FE-86 | BE-62, BE-63 |
| S14, S15 | FE-90, FE-91 | BE-31..BE-34 |
| S17 | FE-93 | — |
| Employee desktop (S1–S6) | Covered by the same tasks: build each screen responsive, with layouts per §4 and §5 | — |
| Visual check | QA-10 (TC-UI-16): compare the built screens with this canvas | — |

---

## 11. Sign-off

| Role | Name | Date | Decision |
|---|---|---|---|
| Product / QA owner | _<your name>_ | _<date>_ | ✅ Design final for build |

Any later change: update the canvas, add a row to the `02-requirements.md` change log, and bump this document's version.
