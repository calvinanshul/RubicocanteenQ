# 05 · Menu catalogue

Add, edit and archive dishes; price snapshot (US-06, S11, S12, M1–M3).

Sprints: S04 · Cases: 13 (7 test cases, 6 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-API-MENU-01 | Create item | S04 | API | P1 | US-06 AC1 · AC 10-1 | POST with `pricePaise` 12000, category `MAIN`; repeat with `COMBO` and `LIGHT` | 201; item returned; new categories accepted, unknown category → 400 | `api/sprint04/canteen.test.ts` | ✅ |
| TC-API-MENU-02 | Invalid item fields | S04 | API | P1 | US-06 AC2/3 · AC 10-1 | Price 0, −5, "abc", 100001; empty name; 81-char name | 400 with field errors | `api/sprint04/canteen.test.ts` | ✅ |
| TC-API-MENU-03 | Duplicate name | S04 | API | P2 | US-06 AC4 · AC 10-1 | Create "Veg Biryani", then "veg biryani" | 409 `DUPLICATE_NAME` | `api/sprint04/canteen.test.ts` | ✅ |
| TC-API-MENU-04 | Price snapshot | S04 | API | P1 | US-06 AC5 · BR6 · AC 10-1 | Order at ₹120; change the price to ₹150; GET the order | The order still shows 12000 paise; a new order uses 15000 | `api/sprint04/canteen.test.ts` | ✅ |
| TC-API-MENU-09 | Archive item | S04 | API | P3 | US-06 AC6 · AC 10-1 | PATCH `isActive:false`; GET active items; GET an old order | Hidden from the active list; the old order still shows the name | `api/sprint04/canteen.test.ts` | ✅ |
| TC-API-VAL-03 | Stored XSS payload | S04 | API | P2 | US-15 AC4 · AC 10-1 | Save a menu item named `<script>alert(1)</script>` | Stored and returned as a literal string (UI rendering checked in TC-UI-11) | `api/sprint04/canteen.test.ts` | ✅ |
| TC-UI-05 | Manager builds a menu | S04 | UI | P1 | US-06 AC1 · US-07 AC1 · AC 10-1 | Add an item; open the Daily menu for its own date (today + 3, so no other script edits it); set quantities; save; an employee whose clock is today + 2 opens Tomorrow (project: desktop) | The employee view for tomorrow shows the items | `e2e/sprint04/admin.spec.ts` | ✅ |
| EC-04-01 | PATCH a missing item; empty PATCH | S04 | API | P2 | — | Input as in the title | 404; 200/400, never 500 | `api/sprint04/canteen.test.ts` | ✅ |
| EC-04-UI1 | Item form price ₹1,001 | S04 | UI | P2 | — | Input as in the title | range error in the dialog | `e2e/sprint04/admin.spec.ts` | ✅ |
| EC-04-11 | Restore an archived dish whose name is now taken | S04 | API | P2 | US-06 AC4/AC6 · AC 10-1 | Archive "X"; create "x"; PATCH the old one `isActive:true` | 409 `DUPLICATE_NAME` | `api/sprint04/probes.test.ts` | ✅ |
| EC-04-UI4 | Restore clash shown in the dialog | S04 | UI | P2 | US-06 AC4 · AC 10-1 | Show archived → Edit → Restore item; API answers 409 DUPLICATE_NAME | "An item with this name already exists" shown in the dialog | `web/test/sprint04-probes.test.tsx` | ✅ |
| EC-04-UI11 | Restore an archived dish (no clash) | S04 | UI | P2 | US-06 AC6 · AC 10-1 | Show archived → Edit → Restore item | Dialog closes, "restored" toast, PATCH `{ isActive: true }` | `web/test/sprint04-probes.test.tsx` | ✅ |
| EC-04-UI12 | Rename after a restore clash | S04 | UI | P2 | US-06 AC4 · AC 10-1 | Restore → 409; change the name; switch Active on; Save | Error clears on edit; PATCH sends the new name and `isActive: true` | `web/test/sprint04-probes.test.tsx` | ✅ |
