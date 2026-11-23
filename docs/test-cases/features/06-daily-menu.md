# 06 · Daily menu

Manager publishes dishes and portions per date (US-07, S13, M4–M5).

Sprints: S01 · Cases: 12 (5 test cases, 7 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-API-MENU-05 | Publish daily menu | S01 | API | P1 | US-07 AC1 · US-08 AC1 · AC 02-2 | PUT `/api/daily-menu/2026-11-18`; GET as employee | 3 items with `remaining = quantity` | `api/menu.test.ts` | ✅ |
| TC-API-MENU-06 | Quantity below ordered | S01 | API | P1 | US-07 AC2 · BR9 · AC 02-3 | 25 ordered; PUT quantity 20 | 409 `QTY_BELOW_ORDERED` | `api/menu.test.ts` | ✅ |
| TC-API-MENU-07 | Invalid daily menu | S01 | API | P2 | US-07 AC3–5 · AC 02-4 | qty 0, −1, 1.5; duplicate item; past date | 400 each time | `api/menu.test.ts` | ✅ |
| TC-API-MENU-08 | Not published / closed day | S01 | API | P2 | US-08 AC4/5 · AC 02-5 | GET a date with no menu; GET a Sunday | 422 `MENU_NOT_PUBLISHED`; `closed: true` | `api/menu.test.ts` | ✅ |
| TC-UI-05 | Manager builds a menu (daily-menu part) | S01 | UI | P1 | US-06 AC1 · US-07 AC1 · AC 02-6 | Add an item; open Daily menu for tomorrow; set quantities; save (project: desktop) | The employee view for tomorrow shows the items | `e2e/daily-menu.spec.ts`, `web/routes/DailyMenuEditor.test.tsx` | ✅ |
| EC-01-17 | Daily menu: archived dish, string qty, 1001, 101 entries, bad path date, repeated query param | S01 | API | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `api/edge.test.ts` › daily menu edge cases | ✅ |
| EC-01-18 | Removing a dish that has orders → 409 | S01 | API | P2 | — | Input as in the title | 409 | `api/edge.test.ts` | ✅ |
| EC-01-19 | Today editable until midnight; yesterday locked | S01 | API | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `api/edge.test.ts` | ✅ |
| EC-01-20 | Closed-day menu round-trip (BUG-01-001) | S01 | API | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `api/edge.test.ts`, `web/test/sprint01-probes.test.tsx` | ✅ |
| EC-01-22 | Invalid `?date=` in the editor (BUG-01-003) | S01 | UI | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `web/test/sprint01-probes.test.tsx` | ✅ |
| EC-01-26 | Past dates read-only in the editor | S01 | UI | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `e2e/daily-menu.spec.ts` | ✅ |
| EC-03-UI13 | Server clock unavailable: daily menu editor shows an error, not an endless skeleton | S03 | UI | P2 | — | GET /api/time returns 500 | error message with "Try again" | `web/test/sprint03-cycle2-probes.test.tsx` | ✅ |
