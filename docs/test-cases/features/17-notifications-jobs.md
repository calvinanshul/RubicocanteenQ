# 17 · Notifications and scheduled jobs

Emails (welcome, role change, order emails) and auto no-show (US-01 AC7, US-04 AC6, US-18, US-20; Sprint 4 stretch).

Sprints: S04 · Cases: 5 (4 test cases, 1 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-API-NTF-01 | Email failure doesn't block | S04 | API | P2 | US-18 AC3 · AC stretch | Email adapter forced to throw | Order 201; error logged | add when ST-16 is built (needs the email adapter seam) | ⏭ stretch ST-16 (email) not built |
| TC-API-SYS-03 | No-show cron | S04 | API | P2 | US-20 AC1/AC2 · AC stretch | Without the secret; with the secret at 13:46 | 401; READY order → `NO_SHOW`, COLLECTED order unchanged | `api/sprint04/stretch.test.ts` | ✅ |
| TC-M-03 | Emails received | S04 | Manual | P2 | US-18 AC1/AC2 · AC stretch | Place an order; mark it READY | Both emails arrive with the correct code | manual | ⏭ stretch ST-16 (email) not built |
| EC-04-14 | No-show timing: grace period and later slots | S04 | API | P2 | US-20 · AC stretch | Wrong token; then 13:44 with orders at 12:30, 13:00 (READY), 14:00 | 401; only the 12:30 order becomes NO_SHOW | `api/sprint04/probes.test.ts` | ✅ |
| TC-M-06 | Emails arrive on the live site (Brevo SMTP) | S04 | Manual | P1 | US-01 AC7 · US-04 AC6 | On https://rubicocanteen-q.vercel.app/ sign up with a company address you can read; as admin change that user's role | "Welcome to CanteenQ" and "Your CanteenQ role is now …" arrive; Brevo → Transactional → Logs shows both delivered | manual (24 Nov 2026) | ✅ |
