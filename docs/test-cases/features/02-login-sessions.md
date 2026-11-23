# 02 · Login, logout and sessions

Login, lockout, logout, session expiry, safe redirects (US-02, S1, A2–A4).

Sprints: S01 · Cases: 12 (7 test cases, 5 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-API-AUTH-04 | No user enumeration | S01 | API | P1 | US-02 AC2 · AC 01-8 | Log in with a wrong password; log in with an unknown email | Both 401 with an **identical** body | `api/auth.test.ts` | ✅ |
| TC-API-AUTH-05 | Lockout after 5 failures | S01 | API | P1 | US-02 AC3 · AC 01-9 | 5 wrong attempts, then the correct password | 6th → 429 `TOO_MANY_ATTEMPTS` | `api/auth.test.ts` | ✅ |
| TC-API-AUTH-06 | Disabled account | S01 | API | P1 | US-02 AC4 · AC 01-10 | Admin deactivates the user; the user logs in | 403 `ACCOUNT_DISABLED` | `api/auth.test.ts` | ✅ |
| TC-API-AUTH-07 | Logout invalidates the session | S01 | API | P1 | US-02 AC5 · AC 01-11 | Log in → logout → GET `/me` | 204, then 401 | `api/auth.test.ts` | ✅ |
| TC-API-AUTH-09 | Expired session | S01 | API | P2 | US-02 AC6 · AC 01-12 | Call `/me` with a token whose `exp` is in the past | 401 `SESSION_EXPIRED` | `api/auth.test.ts` | ✅ |
| TC-U-14 | Login lockout | S01 | Unit | P1 | US-02 AC3 · BR11 · AC 01-9 | 5 failures within 15 min; then 16 min later | Locked; then unlocked; a successful login resets the counter | `api-u/lockout.test.ts` | ✅ |
| TC-UI-02 | Role landing and logout | S01 | UI | P1 | US-02 AC1/AC5 · AC 01-7, 01-11 | Log in as each of the 4 roles; log out; press Back (project: desktop) | Correct home page for each role; after logout, Back → login page | `e2e/roles.spec.ts`, `web/routes/LoginPage.test.tsx` | ✅ |
| EC-01-12 | Lockout lifts after 15 min; success resets counter | S01 | API | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `api/edge.test.ts` › login edge cases | ✅ |
| EC-01-13 | Session of a deleted / deactivated user rejected | S01 | API | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `api/edge.test.ts`, `api/rbac.test.ts` | ✅ |
| EC-01-14 | Tampered JWT → 401 | S01 | API | P2 | — | Input as in the title | 401 | `api/auth.test.ts` | ✅ |
| EC-01-23 | `?next=` open-redirect attempts (`//`, `/\`, absolute URL, other role's page) | S01 | UI | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `web/test/sprint01-probes.test.tsx` | ✅ |
| EC-01-24 | Session expires mid-session → login with banner | S01 | UI | P2 | — | Input as in the title | login with banner | `web/test/sprint01-probes.test.tsx` | ✅ |
