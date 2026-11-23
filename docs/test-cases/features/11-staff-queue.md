# 11 · Staff queue and order status

Queue by slot, status machine, Start / Mark ready (US-12, S7, Q1–Q2).

Sprints: S03 · Cases: 18 (5 test cases, 13 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-API-STF-01 | Queue grouped by slot | S03 | API | P1 | US-12 AC1 · AC 06-2 | 5 orders in 2 slots; GET `/api/orders?date=` | 2 slot groups; `counts` correct; status filter works | `api/sprint03/counter.test.ts` | ✅ |
| TC-API-STF-02 | Valid transitions | S03 | API | P1 | US-12 AC2/AC3 · AC 06-2 | PLACED → PREPARING → READY | 200 each; `readyAt` set | `api/sprint03/counter.test.ts` | ✅ |
| TC-API-STF-03 | Invalid transitions | S03 | API | P1 | US-12 AC4 · AC 06-2 | PATCH COLLECTED; CANCELLED → PREPARING | 409 `INVALID_TRANSITION` | `api/sprint03/counter.test.ts` | ✅ |
| TC-U-07 | Order status transition table | S03 | Unit | P1 | BR7 · US-12 AC4 · AC 06-1 | All 6×6 status pairs | Only the transitions in the state machine are allowed; all others are rejected | `api-u/sprint03.status.test.ts` | ✅ |
| TC-UI-15 | Cancelled order in the staff queue | S03 | UI | P3 | US-12 AC5 · AC 06-2 | Employee cancels; staff open the Queue (project: desktop) | The card is greyed out with no Start, Ready or Hand-over buttons | `e2e/sprint03/counter.spec.ts` | ✅ |
| EC-03-01 | PLACED → READY (skip PREPARING) | S03 | API | P2 | — | Input as in the title | 409 | `api/sprint03/counter.test.ts` | ✅ |
| EC-03-02 | Status `DONE`, empty, null, number | S03 | API | P2 | — | Input as in the title | 400 | `api/sprint03/counter.test.ts` | ✅ |
| EC-03-03 | EMPLOYEE / MANAGER / ADMIN use queue, status, verify, collect or prep list | S03 | API | P2 | — | Input as in the title | 403 | `api/sprint03/counter.test.ts` | ✅ |
| EC-03-04 | Staff marks NO_SHOW; missing order (was manager; counter is staff-only since 2026-11-23) | S03 | API | P2 | — | Input as in the title | 200; 404 | `api/sprint03/counter.test.ts` | ✅ |
| EC-03-05 | Queue with a bad date / unknown status | S03 | API | P2 | — | Input as in the title | 400 | `api/sprint03/counter.test.ts` | ✅ |
| EC-03-13 | Queue defaults to today on the server clock | S03 | API | P2 | — | GET /api/orders with no date at a test-clock time | date = server today; order listed | `api/sprint03/probes.test.ts` | ✅ |
| EC-03-14 | "Issues" filter; ALL counts every order | S03 | API | P2 | — | 4 orders incl. cancelled + no-show; status=ISSUES | only CANCELLED and NO_SHOW; counts.ALL = 4 | `api/sprint03/probes.test.ts` | ✅ |
| EC-03-15 | No-show only after the slot ends | S03 | API | P2 | — | READY 13:00 slot: NO_SHOW at 13:10, then 13:15 | 409, then 200 | `api/sprint03/probes.test.ts` | ✅ |
| EC-03-17 | Status changes and hand-overs are audited | S03 | API | P2 | — | Start, then collect | 2 audit rows (PREPARING, COLLECTED) by the staff user | `api/sprint03/probes.test.ts` | ✅ |
| EC-03-20 | HTML in an employee name stays text | S03 | API | P2 | — | Name `<img src=x onerror=alert(1)>` | returned literally (React renders as text) | `api/sprint03/probes.test.ts` | ✅ |
| EC-03-UI2 | "Now serving" from server time | S03 | UI | P2 | — | Server 12:52 IST | 12:45 slot highlighted, 12:30 not | `web/test/sprint03-probes.test.tsx` | ✅ |
| EC-03-UI3 | Issues tab: cancelled/no-show tickets, no buttons | S03 | UI | P2 | — | Click Issues 2 | tickets BBBBBB, DDDDDD; no buttons | `web/test/sprint03-probes.test.tsx` | ✅ |
| EC-03-UI4 | Start preparing sends PATCH; a 409 is shown | S03 | UI | P2 | — | Click Start preparing; API 409 | PATCH {status: PREPARING}; message shown | `web/test/sprint03-probes.test.tsx` | ✅ |
