# 07 · Menu browsing and cart

Employee sees today's/tomorrow's menu, stock, sold out, cut-off state, cart (US-08, S3).

Sprints: S02 · Cases: 16 (3 test cases, 13 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-UI-07 | Sold out and stepper limits | S02 | UI | P1 | US-08 AC2 · US-09 AC7 · AC 03-2, 04-1 | View a sold-out item; increase the stepper to 5 (project: mobile) | Add is disabled; + is disabled at 5 | `e2e/sprint02/ordering.mobile.spec.ts` | ✅ |
| TC-UI-08 | After cut-off | S02 | UI | P1 | US-08 AC3 · US-10 AC2 · AC 03-3 | Test clock 11:05; open Menu and My Orders (project: mobile) | Closed banner; Tomorrow tab; Cancel button hidden | `e2e/sprint02/ordering.spec.ts` | ✅ |
| TC-UI-11 | XSS rendered as text | S02 | UI | P2 | US-15 AC4 · AC 03-2 | View the menu with the `<script>` item (project: desktop) | The literal text is visible; no dialog event fires | `e2e/sprint02/ordering.spec.ts` | ✅ |
| EC-02-UI2 | Second order the same day | S02 | UI | P2 | — | Input as in the title | "You already have an order" banner | `e2e/sprint02/ordering.spec.ts` | ✅ |
| EC-02-UI3 | Stepper on a dish with 3 left | S02 | UI | P2 | — | Input as in the title | stops at 3 | `e2e/sprint02/ordering.mobile.spec.ts` | ✅ |
| EC-02-UI4 | Filter chips with counts filter the cards | S02 | UI | P2 | — | 4 dishes (1 non-veg); click Non-veg | All 4 · Veg 3 · Non-veg 1; only Chicken Curry shown | `web/test/sprint02-probes.test.tsx` | ✅ |
| EC-02-UI5 | Countdown from server time, red under 10 min | S02 | UI | P2 | — | Server time 10:55 IST | "5 min left" in the error tone | `web/test/sprint02-probes.test.tsx` | ✅ |
| EC-02-UI6 | Stepper capped by stock and max 5; tray shows count | S02 | UI | P2 | — | Dish with 3 left; press + past 3 | stops at 3, + disabled; tray "3 items … Checkout" | `web/test/sprint02-probes.test.tsx` | ✅ |
| EC-02-UI7 | Not published, closed and error states | S02 | UI | P2 | — | M4 422; closed day; M4 500 | "menu isn't published yet"; "The canteen is closed on this day"; error + retry | `web/test/sprint02-probes.test.tsx` | ✅ |
| EC-02-UI8 | After cut-off: banner, Add disabled, jump to tomorrow | S02 | UI | P2 | — | orderingOpen false today | banner; Add disabled; "Order for tomorrow" selects the Tomorrow tab | `web/test/sprint02-probes.test.tsx` | ✅ |
| EC-02-UI16 | Already ordered: View link, Add disabled | S02 | UI | P2 | — | Active order 77 for tomorrow | banner + link /orders/77; Add disabled | `web/test/sprint02-probes.test.tsx` | ✅ |
| EC-02-UI17 | Logout clears the cart | S02 | UI | P2 | — | Add a dish, log out | cart storage no longer holds the dish | `web/test/sprint02-probes.test.tsx` | ✅ |
| EC-02-UI18 | A cart left by another user is not shown | S02 | UI | P2 | — | Stored cart owned by user 999; user 1 opens the menu | Add button, no tray | `web/test/sprint02-probes.test.tsx` | ✅ |
| EC-02-UI19 | Same user keeps their cart across a reload | S02 | UI | P2 | — | Stored cart owned by user 1; user 1 opens the menu | stepper shows 2 | `web/test/sprint02-probes.test.tsx` | ✅ |
| EC-03-UI12 | Server clock unavailable: employee menu shows an error, not an endless skeleton | S03 | UI | P2 | — | GET /api/time returns 500 | error message with "Try again" | `web/test/sprint03-cycle2-probes.test.tsx` | ✅ |
| EC-03-UI15 | "Try again" recovers once the server clock answers | S03 | UI | P2 | — | /api/time fails, then answers; click Try again | the menu loads | `web/test/sprint03-cycle2-probes.test.tsx` | ✅ |
