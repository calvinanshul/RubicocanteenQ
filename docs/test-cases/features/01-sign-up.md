# 01 · Sign up

Company-email sign-up, password rules, hashing, welcome email (US-01, S2, A1, ST-16).

Sprints: S01, S04 · Cases: 26 (8 test cases, 18 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-API-AUTH-01 | Sign up valid | S01 | API | P1 | US-01 AC1 · AC 01-2 | POST signup with valid body | 201; role `EMPLOYEE`; `Set-Cookie` has `HttpOnly`, `SameSite=Lax`; no `passwordHash` in the body | `api/auth.test.ts` | ✅ |
| TC-API-AUTH-02 | Non-company domain | S01 | API | P1 | US-01 AC2 · AC 01-3 | POST signup `x@gmail.com` | 403 `DOMAIN_NOT_ALLOWED`; no user row | `api/auth.test.ts` | ✅ |
| TC-API-AUTH-03 | Duplicate email (case-insensitive) | S01 | API | P1 | US-01 AC3/AC5 · AC 01-4 | Sign up `priya@rubicotech.com`, then ` PRIYA@rubicotech.com ` | 409 `EMAIL_EXISTS` | `api/auth.test.ts` | ✅ |
| TC-API-AUTH-08 | Weak password | S01 | API | P1 | US-01 AC4 · AC 01-5 | Sign up with `abc` | 400 `fields.password` | `api/auth.test.ts` | ✅ |
| TC-U-08 | Password hashing | S01 | Unit | P1 | US-01 AC6 · BR10 · AC 01-6 | `Lunch2026` | Hash ≠ input, starts with `$2b$12$`, verify(correct) = true, verify(wrong) = false | `api-u/password.test.ts` | ✅ |
| TC-U-12 | Sign-up schema | S01 | Unit | P1 | US-01 AC2/4/5 · AC 01-3, 01-5 | `priya@gmail.com`; `abc`; `  Priya@Rubicotech.COM ` | Domain error; password error; normalised to `priya@rubicotech.com` | `shared/schemas.test.ts` › sign-up schema | ✅ |
| TC-UI-01 | Sign up and client validation | S01 | UI | P1 | US-01 AC1/2/4 · US-15 AC1 · AC 01-2, 01-3 | Submit an empty form → see errors; enter a gmail address → see the domain error; enter valid details (project: desktop + mobile) | Errors shown inline with **no network call** for client errors; valid sign-up lands on `/menu` | `e2e/auth.spec.ts`, `web/routes/SignupPage.test.tsx` | ✅ |
| EC-01-07 | Name 81 chars, password 65 chars, blank name, email > 254 | S01 | API | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `api/edge.test.ts` › sign-up edge cases | ✅ |
| EC-01-08 | Look-alike domains (sub-domain, suffix) | S01 | API | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `api/edge.test.ts` | ✅ |
| EC-01-09 | HTML in a name stored literally | S01 | API | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `api/edge.test.ts` | ✅ |
| EC-01-10 | Client-sent `role: ADMIN` ignored | S01 | API | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `api/edge.test.ts` | ✅ |
| EC-01-11 | Non-string field types | S01 | API | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `api/edge.test.ts` | ✅ |
| EC-01-21 | Error text linked to fields (BUG-01-002) | S01 | UI | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `web/test/sprint01-probes.test.tsx`, `web/components/ui/Field.test.tsx` | ✅ |
| EC-01-25 | Duplicate email shown on the field (UI) | S01 | UI | P2 | — | Input as in the title | Behaves as the title describes (no 500; standard error shape) | `e2e/auth.spec.ts`, `web/routes/SignupPage.test.tsx` | ✅ |
| EC-01-28 | `@rubicotech.in` address can sign up (second company domain) | S01 | API + UI | P1 | US-01 AC1 · A4 | Sign up as x@rubicotech.in | 201 / lands on the menu; signup-config lists both domains | `api/auth.test.ts`, `e2e/auth.spec.ts`, `shared/schemas.test.ts` | ✅ |
| EC-01-29 | Domain error names both domains; look-alikes refused | S01 | API | P1 | US-01 AC2 | x@company.co, x@mail.rubicotech.in, x@rubicotech.in.evil.io, x@company.net | 403 "Use your company email (@rubicotech.com or @rubicotech.in)" | `api/auth.test.ts`, `api/edge.test.ts` | ✅ |
| TC-API-AUTH-10 | Welcome email on sign-up | S04 | API | P2 | US-01 AC7 | Sign up with a valid body (fake mailer); repeat with the mailer forced to fail | One "Welcome to CanteenQ" email to the new address; with the failing mailer still 201 and the user exists | `api/email.test.ts` | ✅ |
| EC-04-18 | Welcome email sent on sign-up | S04 | API | P2 | US-01 AC7 · ST-16 (welcome email) | POST signup with a valid body (fake mailer) | 201; exactly one email to the new address, subject "Welcome to CanteenQ", greeting with the name | `api/email.test.ts` | ✅ |
| EC-04-19 | Mail failure never fails the sign-up | S04 | API | P1 | US-01 AC7 · "never blocks" | Mailer rejects (SMTP down) | 201 with the session cookie; the user exists; failure only logged | `api/email.test.ts` | ✅ |
| EC-04-20 | Refused sign-ups send no email | S04 | API | P2 | ST-16 | Duplicate email (409), gmail (403), bad body (400) | No email for any of them | `api/email.test.ts` | ✅ |
| EC-04-U4 | Email is off unless configured | S04 | Unit | P2 | ST-16 | No `MAIL_TRANSPORT` | `none` | `unit/mailer.test.ts` | ✅ |
| EC-04-U5 | SMTP needs a host | S04 | Unit | P3 | ST-16 | `MAIL_TRANSPORT=smtp` without `SMTP_HOST` | Start-up refused naming `SMTP_HOST`; port defaults to 587 | `unit/mailer.test.ts` | ✅ |
| EC-04-U6 | Ethereal login both or neither | S04 | Unit | P3 | ST-16 | Only `ETHEREAL_USER` set; both empty | First refused; empty values count as unset | `unit/mailer.test.ts` | ✅ |
| EC-04-U7 | `none` transport sends nothing | S04 | Unit | P3 | ST-16 | `send()` with `MAIL_TRANSPORT=none` | Resolves `{}` | `unit/mailer.test.ts` | ✅ |
| EC-04-U8 | Welcome email content | S04 | Unit | P2 | ST-16 | Name, email, web origin with a trailing `/` | Addressed to the user; text and HTML have `<origin>/login` | `unit/mailer.test.ts` | ✅ |
| EC-04-U9 | HTML in the name is escaped | S04 | Unit | P1 | ST-16 · security | Name `<img src=x onerror=alert(1)>` | HTML body has `&lt;img …&gt;`, never a tag | `unit/mailer.test.ts` | ✅ |
