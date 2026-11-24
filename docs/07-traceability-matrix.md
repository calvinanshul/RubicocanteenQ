# Stage 7c — Traceability Matrix

Links **Must/Should features → user stories → acceptance criteria → test cases**. Every acceptance criterion has at least one test (0 gaps at baseline). Update the **Status** column as tests run: ✅ Pass · ❌ Fail (add the BUG id) · ⏭ Blocked · ☐ Not run.

> This matrix was generated from `03-user-stories.md` and `07-test-cases.md` by `scripts/trace-matrix.py` (run `python3 scripts/trace-matrix.py docs`), which also reports gaps. Re-run it whenever stories or test cases change, so the matrix can't drift.

## 1. Feature coverage summary

| Feature | Priority | Stories | Has automated test? |
|---|---|---|---|
| M01 Sign-up / login / logout | Must | US-01, US-02 | ✅ U + A + UI |
| M02 RBAC | Must | US-03 | ✅ A + UI |
| M03 User management | Must | US-04 | ✅ A + UI |
| M04 Settings | Must | US-05 | ✅ U + A |
| M05 Menu catalogue | Must | US-06 | ✅ A + UI |
| M06 Daily menu | Must | US-07 | ✅ A + UI |
| M07 Browse menu | Must | US-08 | ✅ A + UI |
| M08 Place order | Must | US-09 | ✅ U + A + UI |
| M09 Cancel order | Must | US-10 | ✅ A + UI |
| M10/M11 QR + history | Must | US-11 | ✅ A + UI |
| M12 Staff queue | Must | US-12 | ✅ U + A + UI |
| M13 Verify pickup | Must | US-13 | ✅ A + UI + M |
| M14 Dashboard | Must | US-14 | ✅ A + UI |
| M15 Validation | Must | US-15 | ✅ U + A + UI |
| M16 Responsive | Must | US-16 | ✅ UI + M |
| M17 Slot capacity *(was S03)* | Must | US-19 | ✅ A |
| S01 CSV export | Should | US-17 | ✅ U + A + UI |
| S02 Email | Should | US-01 AC7, US-04 AC6, US-18 | ✅ U + A + M (welcome and role-change emails; order emails not built) |
| S04 Auto no-show | Should | US-20 | ✅ A |

## 2. Story → acceptance criterion → test case

Levels: U = unit · A = API · UI = Playwright UI · M = manual · N = non-functional

| Story | Title | Features | AC | Test cases | Levels | Status |
|---|---|---|---|---|---|---|
| US-01 | Sign up with company email | M01 | AC1 | TC-API-AUTH-01, TC-UI-01 | A/UI | ☐ Not run |
|  |  |  | AC2 | TC-API-AUTH-02, TC-U-12, TC-UI-01 | U/A/UI | ☐ Not run |
|  |  |  | AC3 | TC-API-AUTH-03 | A | ☐ Not run |
|  |  |  | AC4 | TC-API-AUTH-08, TC-U-12, TC-UI-01 | U/A/UI | ☐ Not run |
|  |  |  | AC5 | TC-API-AUTH-03, TC-U-12 | U/A | ☐ Not run |
|  |  |  | AC6 | TC-U-08 | U | ☐ Not run |
|  |  |  | AC7 | TC-API-AUTH-10, TC-M-06 | A/M | ✅ Pass |
| US-02 | Log in and log out | M01 | AC1 | TC-UI-02 | UI | ☐ Not run |
|  |  |  | AC2 | TC-API-AUTH-04 | A | ☐ Not run |
|  |  |  | AC3 | TC-API-AUTH-05, TC-U-14 | U/A | ☐ Not run |
|  |  |  | AC4 | TC-API-AUTH-06 | A | ☐ Not run |
|  |  |  | AC5 | TC-API-AUTH-07, TC-UI-02 | A/UI | ☐ Not run |
|  |  |  | AC6 | TC-API-AUTH-09 | A | ☐ Not run |
| US-03 | Role-based access | M02 | AC1 | TC-API-RBAC-01, TC-UI-03 | A/UI | ☐ Not run |
|  |  |  | AC2 | TC-API-RBAC-01, TC-API-RBAC-05, TC-UI-03 | A/UI | ☐ Not run |
|  |  |  | AC3 | TC-API-RBAC-01, TC-API-RBAC-03 | A | ☐ Not run |
|  |  |  | AC4 | TC-API-RBAC-04 | A | ☐ Not run |
|  |  |  | AC5 | TC-API-RBAC-02 | A | ☐ Not run |
|  |  |  | AC6 | TC-API-RBAC-06 | A | ☐ Not run |
| US-04 | Admin manages users | M03 | AC1 | TC-API-USR-01 | A | ☐ Not run |
|  |  |  | AC2 | TC-API-USR-02, TC-UI-04 | A/UI | ☐ Not run |
|  |  |  | AC3 | TC-API-USR-03 | A | ☐ Not run |
|  |  |  | AC4 | TC-API-USR-04 | A | ☐ Not run |
|  |  |  | AC5 | TC-API-USR-05 | A | ☐ Not run |
|  |  |  | AC6 | TC-API-USR-06, TC-M-06 | A/M | ✅ Pass |
| US-05 | Admin configures canteen settings | M04 | AC1 | TC-API-SET-01, TC-API-SET-04 | A | ☐ Not run |
|  |  |  | AC2 | TC-API-SET-02, TC-U-15 | U/A | ☐ Not run |
|  |  |  | AC3 | TC-API-SET-02, TC-U-15 | U/A | ☐ Not run |
|  |  |  | AC4 | TC-API-SET-02, TC-U-15 | U/A | ☐ Not run |
|  |  |  | AC5 | TC-API-SET-03 | A | ☐ Not run |
| US-06 | Manager maintains menu items | M05 | AC1 | TC-API-MENU-01, TC-UI-05 | A/UI | ☐ Not run |
|  |  |  | AC2 | TC-API-MENU-02 | A | ☐ Not run |
|  |  |  | AC3 | TC-API-MENU-02 | A | ☐ Not run |
|  |  |  | AC4 | TC-API-MENU-03 | A | ☐ Not run |
|  |  |  | AC5 | TC-API-MENU-04 | A | ☐ Not run |
|  |  |  | AC6 | TC-API-MENU-09 | A | ☐ Not run |
| US-07 | Manager sets the daily menu and quantities | M06 | AC1 | TC-API-MENU-05, TC-UI-05 | A/UI | ☐ Not run |
|  |  |  | AC2 | TC-API-MENU-06 | A | ☐ Not run |
|  |  |  | AC3 | TC-API-MENU-07 | A | ☐ Not run |
|  |  |  | AC4 | TC-API-MENU-07 | A | ☐ Not run |
|  |  |  | AC5 | TC-API-MENU-07 | A | ☐ Not run |
| US-08 | Employee views today's menu | M07 | AC1 | TC-API-MENU-05 | A | ☐ Not run |
|  |  |  | AC2 | TC-UI-07 | UI | ☐ Not run |
|  |  |  | AC3 | TC-UI-08 | UI | ☐ Not run |
|  |  |  | AC4 | TC-API-MENU-08 | A | ☐ Not run |
|  |  |  | AC5 | TC-API-MENU-08, TC-API-ORD-15 | A | ☐ Not run |
| US-09 | Employee places a pre-order | M08 | AC1 | TC-API-ORD-01, TC-U-01, TC-U-05, TC-UI-06 | U/A/UI | ☐ Not run |
|  |  |  | AC2 | TC-API-ORD-02, TC-U-02, TC-U-05 | U/A | ☐ Not run |
|  |  |  | AC3 | TC-API-ORD-02, TC-U-02, TC-U-05 | U/A | ☐ Not run |
|  |  |  | AC4 | TC-API-ORD-03, TC-U-05 | U/A | ☐ Not run |
|  |  |  | AC5 | TC-API-ORD-09, TC-U-05 | U/A | ☐ Not run |
|  |  |  | AC6 | TC-API-ORD-04, TC-U-05 | U/A | ☐ Not run |
|  |  |  | AC7 | TC-API-ORD-05, TC-U-05, TC-U-11, TC-UI-07 | U/A/UI | ☐ Not run |
|  |  |  | AC8 | TC-API-ORD-06, TC-U-05, TC-U-06 | U/A | ☐ Not run |
|  |  |  | AC9 | TC-API-ORD-07, TC-U-05 | U/A | ☐ Not run |
|  |  |  | AC10 | TC-API-ORD-08, TC-U-03, TC-U-05 | U/A | ☐ Not run |
|  |  |  | AC11 | TC-API-ORD-08, TC-U-05 | U/A | ☐ Not run |
| US-10 | Employee cancels an order | M09 | AC1 | TC-API-ORD-10, TC-API-ORD-12, TC-UI-09 | A/UI | ☐ Not run |
|  |  |  | AC2 | TC-API-ORD-11, TC-UI-08 | A/UI | ☐ Not run |
|  |  |  | AC3 | TC-API-ORD-11 | A | ☐ Not run |
|  |  |  | AC4 | TC-API-ORD-11 | A | ☐ Not run |
| US-11 | Employee sees order QR and history | M10 M11 | AC1 | TC-UI-06 | UI | ☐ Not run |
|  |  |  | AC2 | TC-UI-06 | UI | ☐ Not run |
|  |  |  | AC3 | TC-API-ORD-13 | A | ☐ Not run |
|  |  |  | AC4 | TC-API-ORD-14 | A | ☐ Not run |
|  |  |  | AC5 | TC-API-ORD-13 | A | ☐ Not run |
| US-12 | Staff manages the order queue | M12 | AC1 | TC-API-STF-01 | A | ☐ Not run |
|  |  |  | AC2 | TC-API-STF-02, TC-UI-06 | A/UI | ☐ Not run |
|  |  |  | AC3 | TC-API-STF-02, TC-UI-06 | A/UI | ☐ Not run |
|  |  |  | AC4 | TC-API-STF-03, TC-U-07 | U/A | ☐ Not run |
|  |  |  | AC5 | TC-UI-15 | UI | ☐ Not run |
|  |  |  | AC6 | TC-API-STF-04 | A | ☐ Not run |
| US-13 | Staff verifies pickup | M13 | AC1 | TC-API-STF-05, TC-M-01 | A/M | ☐ Not run |
|  |  |  | AC2 | TC-API-STF-05, TC-UI-06 | A/UI | ☐ Not run |
|  |  |  | AC3 | TC-API-STF-06, TC-UI-06 | A/UI | ☐ Not run |
|  |  |  | AC4 | TC-API-STF-07, TC-UI-10 | A/UI | ☐ Not run |
|  |  |  | AC5 | TC-API-STF-08, TC-UI-10 | A/UI | ☐ Not run |
|  |  |  | AC6 | TC-API-STF-09 | A | ☐ Not run |
|  |  |  | AC7 | TC-API-STF-09, TC-UI-10 | A/UI | ☐ Not run |
|  |  |  | AC8 | TC-API-STF-10 | A | ☐ Not run |
| US-14 | Manager views the dashboard | M14 | AC1 | TC-API-RPT-01, TC-API-RPT-05, TC-UI-13 | A/UI | ☐ Not run |
|  |  |  | AC2 | TC-API-RPT-01, TC-API-RPT-05 | A | ☐ Not run |
|  |  |  | AC3 | TC-API-RPT-01 | A | ☐ Not run |
|  |  |  | AC4 | TC-API-RPT-01, TC-UI-13 | A/UI | ☐ Not run |
|  |  |  | AC5 | TC-API-RPT-02 | A | ☐ Not run |
|  |  |  | AC6 | TC-API-RPT-02, TC-UI-13 | A/UI | ☐ Not run |
|  |  |  | AC7 | TC-API-RPT-01 | A | ☐ Not run |
| US-15 | Clear validation on UI and API | M15 | AC1 | TC-U-11, TC-UI-01 | U/UI | ☐ Not run |
|  |  |  | AC2 | TC-API-ORD-05, TC-API-VAL-01, TC-U-11 | U/A | ☐ Not run |
|  |  |  | AC3 | TC-API-VAL-02, TC-U-11 | U/A | ☐ Not run |
|  |  |  | AC4 | TC-API-VAL-03, TC-U-11, TC-UI-11 | U/A/UI | ☐ Not run |
|  |  |  | AC5 | TC-U-11 | U | ☐ Not run |
| US-16 | Works on a mobile screen | M16 | AC1 | TC-UI-12, TC-UI-16 | UI | ☐ Not run |
|  |  |  | AC2 | TC-M-02 | M | ☐ Not run |
|  |  |  | AC3 | TC-M-02 | M | ☐ Not run |
| US-17 | CSV export | S01 | AC1 | TC-API-RPT-03, TC-UI-14 | A/UI | ☐ Not run |
|  |  |  | AC2 | TC-API-RPT-03 | A | ☐ Not run |
|  |  |  | AC3 | TC-API-RPT-04, TC-U-13 | U/A | ☐ Not run |
| US-18 | Email notifications | S02 | AC1 | TC-M-03 | M | ☐ Not run |
|  |  |  | AC2 | TC-M-03 | M | ☐ Not run |
|  |  |  | AC3 | TC-API-NTF-01 | A | ☐ Not run |
| US-19 | Slot capacity | M17 | AC1 | TC-API-ORD-16 | A | ☐ Not run |
|  |  |  | AC2 | TC-API-ORD-16 | A | ☐ Not run |
| US-20 | Auto no-show | S04 | AC1 | TC-API-SYS-03 | A | ☐ Not run |
|  |  |  | AC2 | TC-API-SYS-03 | A | ☐ Not run |

## 3. Business rules, NFRs and assumptions → test cases

Tests that protect a rule or quality attribute rather than a single acceptance criterion:

| Rule / requirement | Test cases | Status |
|---|---|---|
| BR1 cut-off (incl. IST/UTC boundary, A11) | TC-U-01, TC-U-02, TC-U-03, **TC-U-04**, TC-API-ORD-02, TC-UI-08, TC-M-04 | ☐ |
| BR2 no overselling | TC-API-ORD-09, **TC-NFR-02** | ☐ |
| BR4 one active order per day | TC-API-ORD-04, TC-API-ORD-12 | ☐ |
| BR6 price snapshot / A12 money in paise | TC-API-MENU-04, **TC-U-09** | ☐ |
| BR7 status transitions | TC-U-07, TC-API-STF-02, TC-API-STF-03 | ☐ |
| BR8 pickup code single use, unguessable | **TC-U-10**, TC-API-STF-07, TC-API-STF-08, TC-API-ORD-14 | ☐ |
| BR11 login lockout | TC-U-14, TC-API-AUTH-05 | ☐ |
| NFR1 performance | **TC-NFR-01** | ☐ |
| NFR2 data integrity | **TC-NFR-02** | ☐ |
| NFR3 security | TC-API-RBAC-*, TC-API-AUTH-04, **TC-API-SYS-02**, TC-API-RPT-04, **TC-NFR-04** | ☐ |
| NFR5 accessibility | **TC-NFR-03** | ☐ |
| NFR6 responsive | TC-UI-12 | ☐ |
| NFR7 availability | **TC-API-SYS-01** | ☐ |
| R4 counter robustness (exploratory) | **TC-M-05** | ☐ |

## 4. Execution summary (fill in after test runs)

| Level | Total | Pass | Fail | Blocked | Not run |
|---|---|---|---|---|---|
| Unit | 15 | | | | |
| API | 71 | | | | |
| UI | 16 | | | | |
| Manual | 5 | | | | |
| Non-functional | 4 | | | | |
| **Total** | **111** | | | | |
