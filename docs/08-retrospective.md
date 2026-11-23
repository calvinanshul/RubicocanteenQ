# Stage 8b — Retrospective

> Fill this in **honestly** after the build. The brief asks you to name what went wrong and what you'd change, so judges reward candour over polish. The prompts below help; replace them with your real notes.

**Date:** _<date>_ · **Final status:** _X of 16 Must features done, Y Should features done; deployed at <URL>_

## 1. Plan vs actual

| Day | Planned (from `06-build-plan.md`) | Actually happened | Variance and reason |
|---|---|---|---|
| 1 | Docs + scaffold + first deploy | | |
| 2 | Auth + RBAC + admin | | |
| 3 | Menu + ordering core | | |
| 4 | QR + staff + dashboard | | |
| 5 | Validation, responsive, Should features | | |
| 6 | Testing + k6 | | |
| 7 | Hardening + demo | | |

## 2. What went well 👍
- _e.g. Writing the acceptance criteria first made the API tests almost write themselves._
-
-

## 3. What went wrong 👎
- _e.g. I underestimated timezone handling: BUG-00x cost half a day._
- _e.g. AI-generated Prisma schema used `@@unique([userId, orderDate])`, which blocked re-ordering after a cancel. My tests caught it late._
-

## 4. What I learned 💡
- _Technical:_
- _Process:_
- _About using AI:_

## 5. What I'd change next time 🔁

| Change | Why |
|---|---|
| _e.g. Set up the test clock on day 1_ | _Cut-off tests were blocked until day 3_ |
| | |
| | |

## 6. Metrics

| Metric | Value |
|---|---|
| Commits | |
| Must stories done | / 16 |
| Automated tests (U / A / UI) | / / |
| Line coverage (services + validation) | % |
| Bugs found (Crit / High / Med / Low) | / / / |
| AI mistakes caught | |
| k6 place_order p95 | ms |
| Hours spent (approx.) | |

## 7. If I had one more week
1. _e.g. S06 edit order, S07 dietary filters_
2. _e.g. PWA push notification when the order is READY (C03)_
3. _e.g. Pilot with 20 real colleagues and measure the queue-time metric from `01-discovery.md §1.3`_
