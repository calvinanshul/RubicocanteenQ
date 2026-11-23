# Sprint 03 - Test cycle 1
Result: FAIL (1 open bug)
Gates: typecheck ✅ · lint ✅ · unit ✅ · build ✅ · e2e ❌ (41 passed; 1 failing = BUG-03-001; 9 gated/skipped) · clean `npm ci` ✅
Acceptance criteria: 6 of 7 met (X-1 mobile golden path blocked by BUG-03-001; the flow itself works on phones, see below)
Test cases (sprint rows): 51 of 54 pass · 1 failing (BUG-03-001) · 2 manual pending (TC-M-01 camera on a real phone, TC-M-02 tablet layout)

Tested at commit `ef403c5`. Regression: 34 shared + 72 backend unit + 88 web · 200 API · 41 of 42 E2E (run twice, same result).

**Developer's notes: reviewed.**
1. **TC-API-RPT-05:** changing the data from a 5/5 tie to 6/4 is **confirmed**. The assertion is unchanged and the data is now unambiguous. EC-03-12 (a tie goes to the earliest slot) is registered in `features/13-prep-dashboard.md`, and the rule is in `contracts.md`.
2. **AC X-1 on mobile:** the gap is **confirmed** and now covered by `e2e/sprint03/golden.mobile.spec.ts` (employee on a Pixel 5, staff on a 1024 px tablet). The phone flow passes when run alone on today's date: order → Start/Ready → scan → hand over → Collected on the phone, and the phone scan screen fits. The script runs its story on tomorrow's date, using the test clock, so its hand-over can't change today's dashboard count, which the desktop golden path checks. That exposed BUG-03-001.
3. **Demo seed revenue:** ₹22,020 against the mockup's ₹13,800 is **accepted**. The mockup's portion counts and prices can't produce ₹13,800. Every other mockup number matches the demo: 120 orders, 90 collected (75%), 20 pending, 6 cancelled, 4 no-show, +14.3%, slot counts, peak 13:00, prep list 227 portions with two dishes sold out, and Priya's `K7Q4MZ`. I checked these on screen.

**New tests this cycle:** `backend/tests/api/sprint03/probes.test.ts` (EC-03-13..21), `frontend/src/test/sprint03-probes.test.tsx` (EC-03-UI2..UI11) and `frontend/tests/e2e/sprint03/golden.mobile.spec.ts` (TC-UI-06 mobile, EC-03-UI1b).

**Observation (not counted as a bug):** EC-03-UI3 failed once out of 5 runs. That run took 405 s of wall-clock time on a 1 s wait, which means the test process was suspended (for example, the machine slept). The test has no timing dependency of its own, and 4 reruns (each about 3 s) plus both full-suite runs passed. I'll keep watching it in cycle 2.

## BUG-03-001 [minor] Employee screens take "today" from the device clock, not the server
- Status: closed (retested in cycle 2)
- Fix: new `GET /api/time` (server clock, test-clock aware) and `useServerClock()`; the menu, checkout, pass, daily-menu editor, dashboard, prep list, console header/pill and counter clock now use server time and wait for it instead of falling back to the device. Regression tests: `frontend/src/test/server-clock.test.tsx`, `backend/tests/api/system.test.ts` › server clock (X3).
- Criterion: BR1 ("the server time is used, not the client time"); UI spec §6 ("Countdown uses the server time offset"); blocks the AC X-1 mobile script
- Test case: TC-UI-06 (mobile) in features/12-pickup-scan.md
- Steps to reproduce: make the server's date differ from the device's date, for example with the test clock (`x-test-now` = tomorrow 10:05) or a phone whose clock is set wrong. Log in as an employee and open the menu.
- Expected: "Today" is the server's today (20 Nov in the test). The menu, the countdown, checkout and the pass all agree with the server.
- Actual: the menu page computes "today" with `todayIST()` from the device clock, so it shows 19 Nov. The server treats 19 Nov as past, so ordering is closed and Add is disabled. The staff queue and prep list already use the server's date, so the employee and the counter can disagree about what "today" is.
- Failing test: `frontend/tests/e2e/sprint03/golden.mobile.spec.ts` › "TC-UI-06 (mobile) …" (fails 3 out of 3 runs; passes when the server date equals the device date)
- Likely location: `frontend/src/routes/MenuPage.tsx:40`, `CheckoutPage.tsx:37`, `OrderPassPage.tsx:46` and `DailyMenuEditor.tsx:62`, plus the console header date and the cart pruning, which all call `todayIST()` (device clock). The server already sends `serverTime` on menu and order responses; "today" should come from the server.

## Suggestions (not bugs)
- **Staff queue:** collected tickets make up most of the screen at lunch time. Consider collapsing COLLECTED tickets, or defaulting to an "Active" filter.
- **Console status pill:** "Ordering open/closed" in the console sidebar also uses the device clock. It's covered by BUG-03-001's fix if that moves to server time.
- **Manual pending:** TC-M-01 (camera scan on a real phone, under 2 s) and TC-M-02 (768 px tablet queue in 2 columns) need a real device run by the user.
