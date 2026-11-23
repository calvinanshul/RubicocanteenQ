# 15 · Canteen settings and closed dates

Cut-off, pickup window, slot size/capacity, location, holidays (US-05, S15, S1–S5).

Sprints: S01, S04 · Cases: 7 (5 test cases, 2 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-U-15 | Settings schema | S01 | Unit | P2 | US-05 AC2–4 · AC 00-2 | end ≤ start; cut-off ≥ slot start; slotMinutes 7 | 3 field errors | `shared/schemas.test.ts` › settings schema | ✅ |
| TC-API-SET-01 | Save settings | S04 | API | P1 | US-05 AC1 · AC 12-1 | PUT valid settings; GET slots | 200; slots reflect the new window | `api/sprint04/canteen.test.ts` | ✅ |
| TC-API-SET-02 | Invalid settings | S04 | API | P1 | US-05 AC2–4 · AC 12-1 | Three invalid bodies | 400 with field errors each time | `api/sprint04/canteen.test.ts` | ✅ |
| TC-API-SET-03 | Cut-off change doesn't touch existing orders | S04 | API | P2 | US-05 AC5 · AC 12-1 | Place an order at 10:00; change the cut-off to 09:00 | The existing order is unchanged; a new order at 10:05 → 409 `CUTOFF_PASSED` | `api/sprint04/canteen.test.ts` | ✅ |
| TC-API-SET-04 | Pickup location and slot capacity | S04 | API | P1 | US-05 AC1 · AC 12-1 | PUT `pickupLocation` "Building 4 · Counter A", `slotCapacity` 25; GET daily menu, slots and a new order | Daily menu and order show the location; slots report capacity 25 | `api/sprint04/canteen.test.ts` | ✅ |
| EC-04-05 | Closed dates: add, duplicate, list, delete twice, manager adds | S04 | API | P2 | — | Input as in the title | 201, 409, listed, 204/404, 403 | `api/sprint04/canteen.test.ts` | ✅ |
| EC-04-UI6 | Failed settings save keeps the edits | S04 | UI | P2 | US-05 · AC 12-1 | Edit the location; PUT answers 500 | Error shown; the edit and "1 unsaved change" stay | `web/test/sprint04-probes.test.tsx` | ✅ |
