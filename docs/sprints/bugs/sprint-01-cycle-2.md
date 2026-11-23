# Sprint 01 - Test cycle 2
Result: PASS (0 bugs)
Gates: typecheck ✅ · lint ✅ · unit ✅ · build ✅ · e2e ✅ (21/21, desktop + mobile) · clean `npm ci` ✅
Acceptance criteria: 34 of 34 met

Tested at commit `428133e`. Regression run (twice, identical results): 97 unit/component (33 shared + 18 API unit + 46 web) · 90 API · 21 E2E.

## Retest of cycle 1 bugs
| Bug | Result | Evidence |
|---|---|---|
| BUG-01-001 Closed-day menu shown as empty | **closed** | `edge.test.ts` › "a menu saved for a closed day can be read back…" passes. New probes: employees still get `closed: true, orderingOpen: false`; an open day with no menu is still 422; the editor keeps the saved dishes on after saving a closed day (`sprint01-probes.test.tsx` › cycle 2) |
| BUG-01-002 Password error not linked to its field | **closed** | `sprint01-probes.test.tsx` › "the password field references its error message" passes; the same fix covers `SelectField` (`Field.test.tsx`) |
| BUG-01-003 Invalid `?date=` breaks the editor | **closed** | "falls back to a valid date when the URL date is invalid" passes; new probe: stepping from the fallback (`?date=2026-02-30`) requests real dates only |

No new bugs found. No flaky tests.

## Suggestions (not bugs, carried from cycle 1)
- **Dependency advisories:**
  - react-router 6 (GHSA-wrjc-x8rr-h8h6): the `?next=` handling is tested against it.
  - zod 3 (GHSA-mrhx-c7xc-m3w5): mitigated by body and array limits.
  - Plan the major upgrades as a separate chore.
- **Icon font:** Material Symbols is 3.4 MB. Subset it (FE-97).
- **Console status pill:** it ignores closed days and the "Last updated" time doesn't refresh.
- **Unsaved edits:** the daily menu editor drops unsaved edits on a date change without a warning.
- **Local production run:** add a README note that Prisma auto-loads `backend/.env`, which matters when running with `APP_ENV=production` locally.
- **CI and deploy:** the CI workflow hasn't run on GitHub yet (no remote). Deployment is out of scope for this sprint.
