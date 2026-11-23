# Sprint 01 - Test cycle 1
Result: FAIL (3 open bugs)
Gates: typecheck ✅ · lint ✅ · unit ✅ · build ✅ · e2e ✅ (21/21, desktop + mobile) · clean `npm ci` ✅
Acceptance criteria: 32 of 34 met (01-5 and 02-6 partly met)

Tested at commit `da8ad3a`. Regression run: 80 unit · 88 API (45 existing + 43 new) · 41 web (29 existing + 12 new) · 21 E2E. All new tests pass except the 3 that reproduce the bugs below. Each failing test failed 3 out of 3 runs (not flaky).

New tests added this cycle (now part of the regression suite):
- `backend/tests/api/foundation.test.ts`: AC 00-4 (generic 500, oversized body), 00-5 (health 503), 00-6 (DB constraints), 00-7 (seed contents, demo logins, idempotence)
- `backend/tests/api/edge.test.ts`: sign-up/login edge cases, lockout expiry, role escalation via body, M1 access per role, daily-menu edge cases
- `frontend/src/test/sprint01-probes.test.tsx`: AC 01-1 gallery, 01-5 checklist, 01-12 mid-session expiry, field/error linkage, `?next=` redirect safety, 02-6 date stepper

## BUG-01-001 [minor] Menu saved for a closed day is shown as empty, so the editor looks like the save was lost
- Status: closed (retested in cycle 2)
- Fix: `load()` in dailyMenuService always returns stored rows; a closed day still reports `closed: true` / `orderingOpen: false`, and returns `items: []` (200, not 422) only when nothing is saved.
- Criterion: 02-6 (S13: Save → toast; editor shows what is on the menu) / 02-2 (M5 response "same shape as M4")
- Steps to reproduce: As manager, open the editor on a closed weekday (e.g. a Saturday with default settings) → switch Veg Biryani on, 12 portions → Save menu.
- Expected: The rows are saved and the editor still shows Veg Biryani on with 12 portions (plus the "canteen is closed" warning). The PUT response contains the saved items.
- Actual: The data is stored, but `PUT /api/daily-menu/:date` (and M4) return `closed: true, items: []`. The editor re-initialises from that response and switches every dish off. Re-opening the date also shows nothing on the menu and hides "Already ordered". The manager can't see or correct a menu they saved.
- Failing test: `backend/tests/api/edge.test.ts` › "daily menu edge cases › a menu saved for a closed day can be read back by the manager (editor round-trip)"
- Likely location: `backend/src/services/dailyMenuService.ts:28` (`if (closed) return { ...base, items: [] }`). Hiding items for employees on closed days is fine; the manager's read/PUT response still needs the rows (e.g. return items with `closed: true` and let ordering stay closed via `orderingOpen: false`).

## BUG-01-002 [minor] Password error message is not linked to the password field
- Status: closed (retested in cycle 2)
- Fix: `TextField` and `SelectField` merge their own error/hint id with any caller `aria-describedby` instead of letting the spread replace it; regression tests in `frontend/src/components/ui/Field.test.tsx`.
- Criterion: 01-5 (S2 password rules) · UI spec §7 "errors are linked to their field and announced"
- Steps to reproduce: On /signup type `abc` in Password → Create account. Inspect the password input.
- Expected: `aria-describedby` includes the error message id, so screen readers read "Password must be 8–64 characters…".
- Actual: `aria-describedby="password-rules"` only. The caller's prop overrides the error link inside `TextField`, so the error is never announced for this field. The email field works correctly.
- Failing test: `frontend/src/test/sprint01-probes.test.tsx` › "error messages are linked to their fields › the password field references its error message"
- Likely location: `frontend/src/components/ui/Field.tsx:78-80` (`{...rest}` spread after `aria-describedby`) together with `frontend/src/routes/SignupPage.tsx:74`. The ids need to be merged, not replaced.

## BUG-01-003 [minor] Invalid `?date=` in the daily menu editor URL breaks the page
- Status: closed (retested in cycle 2)
- Fix: the editor validates `?date=` with the shared `dateSchema` and falls back to tomorrow when it is missing or malformed.
- Criterion: 02-6 (S13 date stepper)
- Steps to reproduce: As manager open `/manager/daily-menu?date=garbage` (e.g. a mistyped or old bookmark).
- Expected: Fall back to a valid date (tomorrow) or show a clear message; the date label stays readable.
- Actual: The date label renders "undefined NaN undefined", the API returns 400, and the page shows "We couldn't load the menu" with a retry that can never succeed. Previous/Next day also produce invalid dates.
- Failing test: `frontend/src/test/sprint01-probes.test.tsx` › "S13 date stepper (AC 02-6) › falls back to a valid date when the URL date is invalid"
- Likely location: `frontend/src/routes/DailyMenuEditor.tsx:64` (`params.get('date')` is used without validation).

## Suggestions (not bugs)
- **Dependency advisories (`npm audit --omit=dev`):**
  - react-router 6: GHSA-wrjc-x8rr-h8h6, an open redirect via backslash in `navigate`, and GHSA-337j-9hxr-rhxg, SSR only, which doesn't apply here. Our `?next=` check already blocks the backslash cases; tests were added for `//`, `/\`, and absolute URLs.
  - zod 3: GHSA-mrhx-c7xc-m3w5, memory use on oversized collections. This is mitigated by the 100 kb body limit and `max()` on every array.
  - The fixes for both are major-version upgrades (react-router 7, zod 4). Plan them as a separate chore, not inside a sprint.
- **Icon font size:** the Material Symbols font is 3.4 MB (`dist/assets/material-symbols-outlined-*.woff2`), which is heavy on phones and on a sleeping free-tier host. Subset it to the icons used (FE-97).
- **Console status pill:** "Ordering open until 11:00" ignores closed days, and the pill and the "Last updated" footer only change on re-render.
- **Unsaved edits:** the daily menu editor drops unsaved edits without a warning when the date is changed.
- **Local `.env` and the production guard:** Prisma Client auto-loads `backend/.env`. Running the built API locally with `APP_ENV=production` inherits `ENABLE_TEST_CLOCK=true` from that file, and the start-up guard (correctly) refuses to start. Worth a line in the README.
- **CI and deploy are unverified:** the CI workflow hasn't run on GitHub yet because the repo has no remote. Verify it on the first push. Deployment (SET-12..14) is out of scope for this sprint.
