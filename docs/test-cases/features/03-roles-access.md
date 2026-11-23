# 03 · Roles and access control

Server-side RBAC, role guards, navigation per role, 403/404 pages (US-03, S17).

Sprints: S01, S02, S04 · Cases: 13 (8 test cases, 5 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-API-RBAC-02 | Unauthenticated | S01 | API | P1 | US-03 AC5 · AC 01-14 | Call every protected endpoint without a cookie | 401 `UNAUTHENTICATED` | `api/rbac.test.ts` | ✅ |
| TC-API-RBAC-05 | Employee cannot create menu items | S01 | API | P1 | US-03 AC2 · AC 01-15 | EMPLOYEE `POST /api/menu-items` | 403 | `api/rbac.test.ts` | ✅ |
| TC-API-RBAC-06 | Demotion applies immediately | S01 | API | P1 | US-03 AC6 · AC 01-16 | Manager logs in → admin demotes them to EMPLOYEE → the manager's existing session calls `POST /api/menu-items` | 403 | `api/rbac.test.ts` | ✅ |
| TC-UI-03 | Navigation by role | S01 | UI | P1 | US-03 AC1/AC2 · AC 01-13 | As EMPLOYEE, check the nav and then open `/manager/menu` (project: desktop) | Only Menu, My Orders and Profile visible; the page shows "Not authorised" | `e2e/roles.spec.ts`, `web/layouts/RequireRole.test.tsx` | ✅ |
| EC-01-16 | M1 refused for EMPLOYEE/STAFF/ADMIN; M4 open to all roles | S01 | API | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `api/edge.test.ts` › menu access | ✅ |
| TC-API-RBAC-04 | IDOR on orders | S02 | API | P1 | US-03 AC4 · AC 05-2 | Employee B calls GET, QR and cancel on A's order | 404 for all three; A's order unchanged | `api/sprint02/orders.test.ts` | ✅ |
| TC-API-RBAC-01 | **RBAC matrix (data-driven)** | S04 | API | P1 | US-03 AC1–3 · AC H-2 | For each endpoint × 4 roles, call it with a valid body | Status matches the matrix in `05-architecture.md §3` (2xx or 403); runs as one parameterised test (~25 endpoints × 4 roles) | `api/sprint04/canteen.test.ts` | ✅ |
| TC-API-RBAC-03 | Staff cannot change settings | S04 | API | P1 | US-03 AC3 · AC 12-1 | STAFF `PUT /api/settings` | 403 | `api/sprint04/canteen.test.ts` | ✅ |
| TC-UI-03 | Navigation by role (error pages) | S04 | UI | P1 | US-03 AC1/AC2 · AC H-1 | As EMPLOYEE, check the nav and then open `/manager/menu` (project: desktop) | Only Menu, My Orders and Profile visible; the page shows "Not authorised" | `e2e/sprint04/probes.spec.ts`, `web/test/sprint04-probes.test.tsx` › EC-04-UI10 | ✅ |
| EC-04-UI3 | Unknown URL | S04 | UI | P2 | — | Input as in the title | 404 page | `e2e/sprint04/admin.spec.ts` | ✅ |
| EC-02-19 | O3 for staff; manager and admin refused; QR owner-only | S02 | API | P2 | — | STAFF, MANAGER, ADMIN read an employee's order and QR | 200 / 403 / 403; QR 403 for all three (manager refused since 2026-11-23) | `api/sprint02/probes.test.ts` | ✅ |
| EC-03-21 | Staff and report endpoints need a session | S03 | API | P2 | — | Q1–Q4, R1, R2 without a cookie | 401 | `api/sprint03/probes.test.ts` | ✅ |
| EC-04-UI10 | Crash inside a page | S04 | UI | P2 | AC H-1 | A route component throws | "Something went wrong" page with "Go to my home" | `web/test/sprint04-probes.test.tsx` | ✅ |
