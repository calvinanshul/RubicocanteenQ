# 12 · Pickup scan and hand-over

Verify code, collect once, error states, golden path (US-13, S8, Q3–Q4).

Sprints: S03 · Cases: 23 (10 test cases, 13 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-API-STF-05 | Verify and collect | S03 | API | P1 | US-13 AC1/AC2 · AC 07-1 | READY order; verify; collect | 200; `COLLECTED`; `collectedAt` and `collectedById` = staff | `api/sprint03/counter.test.ts` | ✅ |
| TC-API-STF-06 | Lower-case code | S03 | API | P2 | US-13 AC3 · AC 07-1 | Verify `k7q4mz` | 200 | `api/sprint03/counter.test.ts` | ✅ |
| TC-API-STF-07 | Already collected | S03 | API | P1 | US-13 AC4 · AC 07-1 | Collect twice | 2nd → 409 `ALREADY_COLLECTED` | `api/sprint03/counter.test.ts` | ✅ |
| TC-API-STF-08 | Wrong date | S03 | API | P1 | US-13 AC5 · AC 07-1 | Verify tomorrow's order today | 409 `WRONG_DATE` | `api/sprint03/counter.test.ts` | ✅ |
| TC-API-STF-09 | Cancelled / unknown code | S03 | API | P1 | US-13 AC6/AC7 · AC 07-1 | Cancelled order code; `ZZZZZZ` | 409 `INVALID_STATUS`; 404 | `api/sprint03/counter.test.ts` | ✅ |
| TC-API-STF-10 | Not ready yet | S03 | API | P2 | US-13 AC8 · AC 07-1 | Verify a PLACED order; collect | `warning: "NOT_READY"`; collect → `COLLECTED` | `api/sprint03/counter.test.ts` | ✅ |
| TC-M-01 | Camera QR scan on a real device | S03 | Manual | P1 | US-13 AC1 · AC 07-1 | Staff phone scans the QR shown on an employee's phone | The order loads in under 2 s | manual: record the result in the cycle report | M |
| TC-UI-06 | **Golden path end to end** | S03 | UI | P1 | US-09 AC1 · US-11 AC1/2 · US-12 AC2/3 · US-13 AC2/3 · AC X-1 | Employee orders 1 Veg Biryani for slot 13:00 → sees the QR and code → staff (2nd context) Start → Ready → enters the code → Hand over → employee reloads (project: desktop + mobile) | Statuses progress correctly; the employee sees **COLLECTED**; the dashboard count goes up by 1 | `e2e/sprint03/counter.spec.ts` | ✅ |
| TC-UI-10 | Scan error states | S03 | UI | P2 | US-13 AC4/5/7 · AC 07-1 | Enter a collected code, tomorrow's code and `ZZZZZZ` (project: desktop (tablet size)) | The correct red message for each | `e2e/sprint03/counter.spec.ts` | ✅ |
| EC-03-06 | Codes `ABC`, 7 chars, with `0`/`I`, empty, symbols | S03 | API | P2 | — | Input as in the title | 400 | `api/sprint03/counter.test.ts` | ✅ |
| EC-03-07 | Two staff collect the same order at once | S03 | API | P2 | — | Input as in the title | one 200, one 409 | `api/sprint03/counter.test.ts` | ✅ |
| EC-03-08 | Collect a NO_SHOW order | S03 | API | P2 | — | Input as in the title | 409 | `api/sprint03/counter.test.ts` | ✅ |
| EC-03-16 | "Already collected at HH:MM" in IST | S03 | API | P2 | — | Collect at 13:04, verify at 13:10 | "Already collected at 13:04" | `api/sprint03/probes.test.ts` | ✅ |
| EC-03-18 | Employee pass shows COLLECTED after hand-over | S03 | API | P2 | — | Staff collects; employee reads the order | COLLECTED, collectedAt set, not cancellable | `api/sprint03/probes.test.ts` | ✅ |
| EC-03-UI5 | No camera → typed-code fallback | S03 | UI | P2 | — | jsdom has no mediaDevices | "Camera not available." and the code input is focused | `web/test/sprint03-probes.test.tsx` | ✅ |
| EC-03-UI6 | Lower-case code, NOT_READY warning, hand-over | S03 | UI | P2 | — | Type k7q4mz; verify returns NOT_READY | sends K7Q4MZ; warning; HAND OVER → "Handed over" | `web/test/sprint03-probes.test.tsx` | ✅ |
| EC-03-UI7 | Screen resets 3 s after "Handed over" | S03 | UI | P2 | — | Hand over, advance 3.1 s | message gone, input empty | `web/test/sprint03-probes.test.tsx` | ✅ |
| EC-03-UI8 | Scan errors shown big and red | S03 | UI | P2 | — | Verify returns ALREADY_COLLECTED / WRONG_DATE / INVALID_STATUS / NOT_FOUND | role=alert with the S8 text; no HAND OVER | `web/test/sprint03-probes.test.tsx` | ✅ |
| TC-UI-06 (mobile) | Golden path with the employee on a phone (AC X-1) | S03 | UI | P2 | — | Phone (Pixel 5) orders on the test clock's "today" (tomorrow's date) → tablet Start/Ready/scan/hand over → phone shows Collected | phone shows Collected; QR gone | `e2e/sprint03/golden.mobile.spec.ts` | ✅ |
| EC-03-UI1b | Staff scan page on a phone | S03 | UI | P2 | — | Pixel 5, /staff/scan | no horizontal scroll; buttons ≥ 44 px | `e2e/sprint03/golden.mobile.spec.ts` | ✅ |
| EC-03-UI16 | Leaving the scan page when the camera didn't start | S03 | UI | P1 | US-13 · BUG-03-003 | Camera denied or still starting → type code → HAND OVER → "Back to queue" | Queue opens and loads orders; never "Something went wrong" | `web/test/scan-camera-cleanup.test.tsx` | ✅ |
| EC-03-UI17 | A running camera is switched off when leaving | S03 | UI | P2 | US-13 · BUG-03-003 | Camera on → hand over → leave the page | `stop()` called once; camera released | `web/test/scan-camera-cleanup.test.tsx` | ✅ |
| EC-03-UI18 | A camera that starts after leaving is switched off | S03 | UI | P2 | US-13 · BUG-03-003 | Leave while the camera is still starting; it starts afterwards | It is stopped straight away, not left running | `web/test/scan-camera-cleanup.test.tsx` | ✅ |
