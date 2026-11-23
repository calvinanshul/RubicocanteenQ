# 04 · Platform and foundation

Error format, health, test clock, DB constraints, seed, money helpers, UI kit (ST-00).

Sprints: S01 · Cases: 15 (5 test cases, 10 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-API-SYS-01 | Health | S01 | API | P3 | NFR7 · AC 00-5 | GET `/api/health` | 200 `{status:"ok", db:"ok"}` | `api/system.test.ts` | ✅ |
| TC-API-SYS-02 | **Test clock disabled in prod** | S01 | API | P1 | Security · AC 00-3 | Against the production build (`ENABLE_TEST_CLOCK` unset), send `x-test-now: 2026-11-17T09:00+05:30` after the real cut-off | The header is ignored; the real time is used | `api/system.test.ts`, `api-u/env.test.ts` | ✅ |
| TC-API-VAL-01 | Consistent error shape | S01 | API | P1 | US-15 AC2 · AC 00-4 | Trigger a 400 on 5 different endpoints | All match `{error:{code,message,fields?}}` | `api/system.test.ts` | ✅ |
| TC-API-VAL-02 | Malformed JSON | S01 | API | P2 | US-15 AC3 · AC 00-4 | Body `{"date":` | 400 `INVALID_JSON`; no stack trace in the body | `api/system.test.ts` | ✅ |
| TC-U-09 | Money in paise | S01 | Unit | P2 | A12 · AC 00-2 | 3 × 3333 paise; `formatINR(9999)`; `toPaise("120.50")` | 9999; `₹99.99`; 12050; `toPaise("10.999")` throws | `shared/money.test.ts` | ✅ |
| EC-01-01 | Generic 500, no leaked message or stack | S01 | API | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `api/foundation.test.ts` › unexpected errors | ✅ |
| EC-01-02 | Oversized body (>100 kb) → standard error | S01 | API | P2 | — | Input as in the title | standard error | `api/foundation.test.ts` | ✅ |
| EC-01-03 | Health 503 when the DB is down | S01 | API | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `api/foundation.test.ts` | ✅ |
| EC-01-04 | DB CHECKs: stock, quantity range, price range, qty ≥ 1 | S01 | API | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `api/foundation.test.ts` › database constraints | ✅ |
| EC-01-05 | Partial unique indexes: dish name, one active order/day, re-order after cancel | S01 | API | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `api/foundation.test.ts` | ✅ |
| EC-01-06 | Seed contents, demo logins, idempotent re-run | S01 | API | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `api/foundation.test.ts` › seed | ✅ |
| EC-01-15 | Invalid `x-test-now` ignored | S01 | API | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `api/edge.test.ts` | ✅ |
| EC-01-27 | UI kit gallery renders; dialog Esc; toast | S01 | UI | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `web/test/sprint01-probes.test.tsx` | ✅ |
| EC-03-22 | "Today" comes from the server clock (BUG-03-001 regression) | S03 | API + UI | P1 | BR1 | Server a day ahead of the device (GET /api/time); open menu, tomorrow tab, editor, counter clock | requests use the server's date; counter clock shows server time; X3 honours the test clock | `web/test/server-clock.test.tsx`, `api/system.test.ts` | ✅ |
| EC-03-UI14 | Logging out of the manager console does not crash (hook order) | S03 | UI | P2 | — | Manager dashboard → Log out | login page, no error page | `web/test/sprint03-cycle2-probes.test.tsx` | ✅ |
