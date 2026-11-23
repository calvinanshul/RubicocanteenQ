# Sprint 03 - Test cycle 2
Result: FAIL (1 open bug)
Gates: typecheck ✅ · lint ✅ · unit ✅ (the 2 new probes for BUG-03-002 fail) · build ✅ · e2e ✅ (42 passed; 9 gated) · clean `npm ci` ✅
Acceptance criteria: 7 of 7 met
Test cases (sprint rows): 54 of 58 pass · 2 failing (BUG-03-002) · 2 manual pending (TC-M-01, TC-M-02)

Tested at commit `e0c9b38`. Regression: 34 shared + 72 backend unit + 95 web (2 failing, below) · 201 API · 42 E2E.

## Retest of cycle 1 bugs
| Bug | Result | Evidence |
|---|---|---|
| BUG-03-001 "Today" from the device clock | **closed** | TC-UI-06 (mobile) passes: the phone uses the server's "today" (tomorrow's date via the test clock) end to end. The developer's regression tests pass (`server-clock.test.tsx`, X3 in `system.test.ts`), registered as EC-03-22. The follow-up hook-order fix is covered by EC-03-UI14 (logging out of the console doesn't crash). |

**Developer's test-infra change reviewed:** `frontend/src/test/utils.tsx` now answers `/api/time` by default with the device clock, unless a test returns its own `serverTime`. **Confirmed.** It loosens no assertion. The cycle 1 observation (EC-03-UI3 suspended once) didn't recur: 3 full E2E runs and every web run passed.

## BUG-03-002 [minor] If the server clock can't be read, the menu and editor load forever
- Status: closed (retested in cycle 3)
- Fix: `useServerClock()` now also returns `error` and `retry`; the menu, daily menu editor and checkout show the standard error with "Try again" (which reads the clock again) instead of a skeleton. Regression test: `server-clock.test.tsx` › server clock unavailable.
- Criterion: coding standard "handle loading, empty and error states for every data fetch"; introduced by the BUG-03-001 fix
- Test case: EC-03-UI12 in features/07-menu-browsing.md, EC-03-UI13 in features/06-daily-menu.md
- Steps to reproduce: make `GET /api/time` fail (500 or network error). Open `/menu` as an employee, or `/manager/daily-menu` as a manager.
- Expected: an error message with "Try again" (as for every other failed load); retrying reads the clock again.
- Actual: the date stays `null`, the menu and slot queries never run, and the page shows its skeleton forever with no message and no retry. Checkout without a `?date=` behaves the same way.
- Failing test: `frontend/src/test/sprint03-cycle2-probes.test.tsx` › EC-03-UI12, EC-03-UI13 (fail 3 out of 3 runs)
- Likely location: `frontend/src/lib/serverClock.ts:49-53` (`useServerClock` returns only `{ now, today }` and hides the query's error state); callers `MenuPage.tsx:41`, `DailyMenuEditor.tsx:63` and `CheckoutPage.tsx:37` treat "no date yet" as loading.

## Suggestions (not bugs, carried over)
- **Staff queue:** collapse COLLECTED tickets, or default to an "Active" filter.
- **Manual pending:** TC-M-01 (camera on a real phone) and TC-M-02 (768 px tablet queue).
