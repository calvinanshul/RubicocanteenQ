# Sprint 04 - Test cycle 1
Result: FAIL (2 open bugs)
Gates (after a clean `npm ci`): typecheck ✅ · lint ✅ · unit ✅ (shared 45, backend 82, web 112) · API ✅ (335, including the stretch script with `SPRINT_STRETCH=1`) · build ✅ · e2e ✅ (49 passed; 2 phone-only tests skip on the desktop project by design)
Acceptance criteria: 7 of 7 met (both bugs are edge cases with a workaround)
Test cases (sprint rows): 54 of 65 pass · 2 fail (BUG-04-001, BUG-04-002) · 7 manual pending · 2 skipped (stretch ST-16 email not built)

New in this cycle: 15 edge-case rows with scripts.
- **API** (`backend/tests/api/sprint04/probes.test.ts`): EC-04-10…17.
- **Web** (`frontend/src/test/sprint04-probes.test.tsx`): EC-04-UI4…UI8 and UI10.
- **Browser** (`frontend/tests/e2e/sprint04/probes.spec.ts`):
  - EC-04-UI9, the statement download.
  - A script for the Sprint 4 part of TC-UI-03. Its row pointed at `admin.spec.ts`, which had no 403 check for the new console pages.

## BUG-04-001 [minor] Restoring an archived dish whose name is taken fails silently
- Status: closed in cycle 2 (Archive/Restore now uses the same error handler as Save, so the 409 `name` error shows under "Dish name")
- Criterion: 10-1 (US-06 AC4/AC6)
- Test case: EC-04-UI4 in features/05-menu-catalogue.md (API side EC-04-11 passes: 409 `DUPLICATE_NAME`)
- Steps to reproduce:
  1. Archive "Veg Biryani".
  2. Create a new "veg biryani".
  3. Tick "Show archived", open the old one with Edit, and click "Restore item".
- Expected: the dialog says "An item with this name already exists".
- Actual: nothing happens. The dialog stays open with no message. The 409 carries a `fields.name` error, so the form-level alert is hidden too, and the archive/restore call has no `onError`, so the field error is never set.
- Failing test: `frontend/src/test/sprint04-probes.test.tsx` › EC-04-UI4
- Likely location: `frontend/src/routes/MenuItemDialog.tsx`, in `archive()` (no error handling) and in the `formError` rule.

## BUG-04-002 [minor] Users search over 100 characters shows the load-error state
- Status: closed in cycle 2 (the search box stops at 100 characters (`USER_SEARCH_MAX`, shared with the API schema), and `useUsers` never sends more than that)
- Criterion: 11-1 (US-04 AC1)
- Test case: EC-04-UI5 in features/14-users-admin.md
- Steps to reproduce: on Users & roles, paste 150 characters into "Search users".
- Expected: "No users match". Long text can't match anyone, so it should be cut to the API limit or handled.
- Actual: the API answers 400 (`q` is limited to 100 characters). The page shows "Something went wrong · We couldn't load the users.", and "Try again" fails the same way.
- Failing test: `frontend/src/test/sprint04-probes.test.tsx` › EC-04-UI5
- Likely location: `frontend/src/routes/UsersPage.tsx`. The search field has no `maxLength`, and the value isn't trimmed to 100 before `useUsers`.

## Manual / pending (not counted as passed)
These need the user, a real device or staging:
- TC-UI-16, visual comparison. The screenshots are saved by `e2e/sprint04/admin.spec.ts` › TC-UI-16 under `frontend/test-results/`; compare them with `docs/design/*/screen.png`.
- TC-M-04 and TC-M-05, exploratory charters.
- TC-NFR-01 and TC-NFR-02, the k6 load test and the oversell check on staging.
- TC-NFR-03 (Lighthouse) and TC-NFR-04 (ZAP), both optional.

Still pending from Sprint 3: TC-M-01 (camera scan on a real phone) and TC-M-02 (tablet layout).

Skipped: TC-API-NTF-01 and TC-M-03 (stretch ST-16, email). They aren't built, and no email provider is configured. ST-17 (auto no-show) was built, and TC-API-SYS-03 passes with `SPRINT_STRETCH=1`.

## Suggestions (not bugs)
- **Demoting yourself:** an admin who demotes themselves (while other admins exist) stays on the Users page until the cached `/me` expires. The page then shows its load-error state instead of moving them to their new home. Rare, and it asks for confirmation first. Consider refreshing `me` after a self-change.
- **CSV size:** CSV exports are built in memory. That's fine at the expected size (about 1,600 rows a month), but stream the response if ranges grow.
- **Audit logs:** menu, user and settings changes are written to `AuditLog`, but no screen shows them yet.
