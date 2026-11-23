# 14 · Users and roles admin

Admin searches users, changes roles, deactivates; last-admin rule (US-04, S14, U1–U2).

Sprints: S04 · Cases: 14 (6 test cases, 8 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-API-USR-01 | Search and paginate | S04 | API | P2 | US-04 AC1 · AC 11-1 | `GET /api/users?q=ram&page=1` | 200; only matching users; `pageSize` 20 | `api/sprint04/canteen.test.ts` | ✅ |
| TC-API-USR-02 | Change role | S04 | API | P1 | US-04 AC2 · AC 11-1 | PATCH role MANAGER | 200; `/me` for that user shows MANAGER | `api/sprint04/canteen.test.ts` | ✅ |
| TC-API-USR-03 | Deactivate | S04 | API | P1 | US-04 AC3 · AC 11-1 | PATCH `isActive:false` | 200; that user's login → 403 | `api/sprint04/canteen.test.ts` | ✅ |
| TC-API-USR-04 | Last admin protected | S04 | API | P1 | US-04 AC4 · AC 11-1 | The only admin demotes or deactivates themselves | 409 `LAST_ADMIN` | `api/sprint04/canteen.test.ts` | ✅ |
| TC-API-USR-05 | Unknown user | S04 | API | P3 | US-04 AC5 · AC 11-1 | PATCH `/api/users/999999` | 404 | `api/sprint04/canteen.test.ts` | ✅ |
| TC-UI-04 | Admin changes a role | S04 | UI | P2 | US-04 AC2 · AC 11-1 | Users → search → change role → save (project: desktop) | Success toast; the table shows the new role | `e2e/sprint04/admin.spec.ts` | ✅ |
| EC-04-02 | Unknown role, bad employee code, non-boolean active | S04 | API | P2 | — | Input as in the title | 400 | `api/sprint04/canteen.test.ts` | ✅ |
| EC-04-03 | Set employee code + department | S04 | API | P2 | — | Input as in the title | saved | `api/sprint04/canteen.test.ts` | ✅ |
| EC-04-04 | Search `' OR 1=1 --`, `%`, `_`, HTML; page 0; role CHEF | S04 | API | P2 | — | Input as in the title | 200 as text; 400; 400 | `api/sprint04/canteen.test.ts` | ✅ |
| EC-04-10 | Two admins demote each other at the same moment | S04 | API | P1 | US-04 AC4 · AC 11-1 | Only two active admins; concurrent PATCH role EMPLOYEE on each other | Exactly one succeeds; one active admin remains | `api/sprint04/probes.test.ts` | ✅ |
| EC-04-15 | Disabling a user ends their current session | S04 | API | P1 | US-04 AC3 · BR12 · AC 11-1 | User logged in; admin sets isActive false; user calls the API again | 401 on the next request | `api/sprint04/probes.test.ts` | ✅ |
| EC-04-16 | Role filter, per-role counts, no password data | S04 | API | P2 | US-04 AC1 · AC 11-1 | `GET /api/users?q=tag&role=STAFF` | Only STAFF rows; `roleCounts` for the search; no hash/lockout fields | `api/sprint04/probes.test.ts` | ✅ |
| EC-04-UI5 | Search text longer than 100 characters | S04 | UI | P3 | US-04 AC1 · AC 11-1 | Paste 150 characters into "Search users" | "No users match", never the load-error state | `web/test/sprint04-probes.test.tsx` | ✅ |
| EC-04-UI13 | Search at exactly 100 characters | S04 | UI | P3 | US-04 AC1 · AC 11-1 | Paste 101 characters | Box keeps 100; the request `q` has all 100 | `web/test/sprint04-probes.test.tsx` | ✅ |
