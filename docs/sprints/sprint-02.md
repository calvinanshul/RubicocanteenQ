# Sprint 02 · Order Lunch

**Goal:** Priya can browse today's menu, order before 11:00 with a pickup slot, get her QR pass and cancel if her plans change. Two people can never buy the same last portion.
**Stories:** ST-03 (5) · ST-04 (8) · ST-05 (3) · ST-08 (3) = 19 pts · Source: `06-sprint-plan.md §3`

## Acceptance criteria

| AC | Criterion | Tests |
|---|---|---|
| 03-1 | Rules module: cut-off, today/tomorrow window, IST boundary, slot generation and validation, closed days | TC-U-01..06 |
| 03-2 | US-08 AC1/AC2: S3 menu (mobile + desktop): stock, "Only N left", sold out ("Unavailable"), filter chips with counts | TC-UI-07 |
| 03-3 | US-08 AC3: countdown from server time; after cut-off, a closed banner and the Tomorrow tab | TC-UI-08 |
| 03-4 | US-08 AC4/AC5: not-published, closed-day and already-ordered states; skeleton loading | TC-API-MENU-08 |
| 04-1 | Cart: mobile tray and desktop "Your order" panel; stepper 1–5 | Cart unit tests, TC-UI-07 |
| 04-2 | US-19: `GET /api/slots` with booked/capacity/available; full slots are shown and can't be chosen | TC-API-ORD-16 |
| 04-3 | US-09 AC1–AC11: place order with atomic stock, slot capacity, price snapshot, one active order per day, idempotency, validation | TC-API-ORD-01..09, 15 |
| 04-4 | S4 checkout per the UI spec, with inline errors (out of stock, cut-off, slot full) | TC-UI-06 (part) |
| 05-1 | US-11 AC1/AC2/AC4: S5 pass with a real QR (pickup code only), backup code + copy, status stepper, polled every 20 s | TC-API-ORD-14 |
| 05-2 | US-03 AC4: another user's order → 404 for GET, QR and cancel | TC-API-RBAC-04 |
| 08-1 | US-10 AC1–AC4: cancel before the cut-off restores stock; re-ordering is allowed; 409/404 cases | TC-API-ORD-10..12, TC-UI-09 |
| 08-2 | TC-API-ORD-09 passes 5 runs in a row | — |
