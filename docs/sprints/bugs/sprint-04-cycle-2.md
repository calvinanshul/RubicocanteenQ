# Sprint 04 - Test cycle 2
Result: PASS (0 open bugs)
Gates (after a clean `npm ci`): typecheck ✅ · lint ✅ · unit ✅ (shared 45, backend 82, web 121) · API ✅ (343, including the stretch script with `SPRINT_STRETCH=1`) · build ✅ · e2e ✅ (51 of 51 in each of the last 5 full runs)
Acceptance criteria: 7 of 7 met
Test cases (sprint rows): 59 of 68 pass · 7 manual pending · 2 skipped (stretch ST-16 email not built)

## Retest of cycle 1
- **BUG-04-001: closed.** EC-04-UI4 passes. Two new probes cover the paths around the fix:
  - EC-04-UI11: a restore without a clash closes the dialog and sends `{ isActive: true }`.
  - EC-04-UI12: after a clash, renaming clears the error, and Save sends the new name.
- **BUG-04-002: closed.** EC-04-UI5 passes. New probe EC-04-UI13: the box keeps exactly 100 characters, and all 100 are sent.

## BUG-04-003 [minor] flaky: TC-UI-05 collided with daily-menu.spec.ts on tomorrow's menu
- Status: closed (test script fixed in this cycle; no application change)
- Criterion: 10-1
- Test case: TC-UI-05 in features/05-menu-catalogue.md
- Steps to reproduce: run the full E2E suite with 2 workers. Seen in 1 of 5 runs, where TC-UI-05 and the daily-menu test both failed.
- Cause: both scripts open the daily-menu editor on **tomorrow** and save it, and M5 replaces the whole day's menu. When the saves overlap, the second save drops the first one's dishes or quantities.
- Fix (test only):
  - TC-UI-05 now publishes its dish on its own date, today + 3.
  - The employee checks it with the test clock at today + 2, so "Tomorrow" is that date.
  - The steps and assertions are unchanged.
- Verification:
  - TC-UI-05 passed 5 of 5 repeats running in parallel with `daily-menu.spec.ts` (`--repeat-each=5`).
  - The full suite then passed twice: 51 of 51 each time.
- Note: in the same stress run, repeats 2 to 5 of `daily-menu.spec.ts` failed, because that test expects the freshly seeded 30 portions. That is expected with `--repeat-each` (the database is seeded once per run). It's not a defect, and the test passes in every normal run.
- Failing test (before the fix): `frontend/tests/e2e/sprint04/admin.spec.ts` › TC-UI-05

## Manual / pending (not counted as passed)
- **Visual comparison (TC-UI-16):** the screenshots are saved by `e2e/sprint04/admin.spec.ts` › TC-UI-16; compare them with `docs/design/*/screen.png`.
- **Exploratory charters:** TC-M-04 and TC-M-05.
- **On staging:** TC-NFR-01 and TC-NFR-02 (k6 load test and the oversell check).
- **Optional:** TC-NFR-03 (Lighthouse) and TC-NFR-04 (ZAP).
- **From Sprint 3:** TC-M-01 (camera scan on a real phone) and TC-M-02 (tablet layout).

Skipped: TC-API-NTF-01 and TC-M-03. They need stretch ST-16 (email), which isn't built.

## Suggestions (not bugs)
- **Two managers on one day's menu:** last save wins, the same lost-update pattern as BUG-04-003. With one manager per canteen this is unlikely. If it becomes a concern, send the menu's `updatedAt` with M5 and answer 409 on a mismatch.
- **Carried over from cycle 1:**
  - After an admin demotes themselves, refresh the cached `/me`.
  - Stream CSV exports if date ranges grow.
  - Add a screen for the audit log.
