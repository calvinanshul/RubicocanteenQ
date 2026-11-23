# 10 · My orders (history)

Order history, paging, empty state (US-11 AC3/5, S6, O2).

Sprints: S04 · Cases: 5 (1 test cases, 4 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-API-ORD-13 | My orders | S04 | API | P2 | US-11 AC3/AC5 · AC 14-1 | User with 12 orders; page 1 and page 2; new user | Newest first, 10 then 2; new user gets an empty list | `api/sprint04/canteen.test.ts` | ✅ |
| EC-04-06 | My orders never include another user's | S04 | API | P2 | — | Input as in the title | total 0 | `api/sprint04/canteen.test.ts` | ✅ |
| EC-04-UI2 | New employee's history | S04 | UI | P2 | — | Input as in the title | `No orders yet` + `Go to menu` | `e2e/sprint04/admin.spec.ts` | ✅ |
| EC-02-25 | My orders filtered by date | S02 | API | P2 | — | Orders today and tomorrow; GET /orders/me?date=tomorrow; bad date | 1 order for tomorrow; 400 | `api/sprint02/probes.test.ts` | ✅ |
| EC-04-17 | Monthly statement summary on My orders | S04 | API | P2 | US-11 AC5 · AC 14-1 | This month: one NO_SHOW ₹100, one CANCELLED ₹300 | `summary` = 1 order, 10000 paise | `api/sprint04/probes.test.ts` | ✅ |
