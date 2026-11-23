# Sprint 04 · Run the Canteen & Release

**Goal:** Managers and admins run the canteen from the UI; employees see their history; the app is hardened, fully tested and demo-ready.
**Stories:** ST-10, ST-11, ST-12, ST-14, ST-15 = 16 pts (+ stretch ST-16, ST-17, ST-18) · Source: `06-sprint-plan.md §5`

## Acceptance criteria (committed)

| AC | Criterion | Tests |
|---|---|---|
| 10-1 | US-06 AC1–AC6: S11 catalogue + S12 dialog: add, edit, archive; price rules; duplicate names; price snapshot | TC-API-MENU-01..04, 09, TC-UI-05 |
| 11-1 | US-04 AC1–AC5: S14 users: search, role change (with confirm), disable, last-admin protection | TC-API-USR-01..05, TC-UI-04 |
| 12-1 | US-05 AC1–AC5 + closed dates: S15 settings, cross-field errors, holidays | TC-API-SET-01..04, TC-API-ORD-15 |
| 14-1 | US-11 AC3/AC5: S6 my orders: active order, history, monthly total, empty state | TC-API-ORD-13 |
| 15-1 | US-17 AC1–AC3: S16 exports: orders CSV and statement CSV with formula-injection escaping | TC-U-13, TC-API-RPT-03, 04, TC-UI-14 |
| H-1 | S17 error pages (403/404/unexpected) | TC-UI-03 |
| H-2 | Hardening: RBAC matrix, responsive + a11y pass, remaining E2E, visual check | TC-API-RBAC-01, TC-UI-01..16 |

## Stretch
ST-16 email (US-18) · ST-17 auto no-show (US-20) · ST-18 live orders feed (D16)

## Manual / outside the loop
k6 load test on staging (TC-NFR-01/02) and the real-device camera scan (TC-M-01) need deployed infrastructure and hardware.
