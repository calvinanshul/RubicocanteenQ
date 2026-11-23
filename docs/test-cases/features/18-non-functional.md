# 18 · Non-functional, responsive and manual

Load, responsiveness, accessibility, visual check, security scan, exploratory testing.

Sprints: S01, S02, S03, S04 · Cases: 10 (10 test cases, 0 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-UI-12 | Mobile layout (shell part) | S01 | UI | P1 | US-16 AC1 · NFR6 · AC 01-17 | Open Menu, Checkout and My Orders (project: mobile (360×740)) | `document.documentElement.scrollWidth <= 360`; bottom nav visible; buttons ≥ 44 px tall | `e2e/layout.spec.ts` | ✅ |
| TC-UI-12 | Mobile layout | S02 | UI | P1 | US-16 AC1 · NFR6 · AC 03-2, 04-4 | Open Menu, Checkout and My Orders (project: mobile (360×740)) | `document.documentElement.scrollWidth <= 360`; bottom nav visible; buttons ≥ 44 px tall | `e2e/sprint02/ordering.mobile.spec.ts` | ✅ |
| TC-M-02 | Tablet and desktop layouts | S03 | Manual | P2 | US-16 AC2/AC3 · AC 06-2 | 768 px queue; 1280 px dashboard | 2-column queue; KPI tiles in one row | manual | M |
| TC-M-04 | Exploratory: cut-off rush | S04 | Manual | P2 | R2 | 30-min charter: order, cancel and re-order near 10:59 with network throttling (Slow 3G) | Notes and bugs logged | manual (30-min charter) | M |
| TC-M-05 | Exploratory: counter chaos | S04 | Manual | P2 | R4 | 30-min charter: rapid scans, duplicate scans, wrong-day codes, airplane mode | Notes and bugs logged | manual (30-min charter) | M |
| TC-NFR-01 | Load: pre-cut-off ordering rush | S04 | Non-functional | P1 | NFR1 · AC H5 | See [`07-non-functional-test.md`](07-non-functional-test.md) | — | `backend/tests/perf/order-rush.js` (staging) | M |
| TC-NFR-02 | Overselling invariant under load | S04 | Non-functional | P1 | NFR2 · AC H5 | Same run; DB check afterwards | — | `backend/tests/perf/oversell-checks.sql` | M |
| TC-NFR-03 | Lighthouse accessibility *(optional)* | S04 | Non-functional | P3 | NFR5 · AC H-2 | Score ≥ 90 on `/menu`, `/orders`, `/staff/queue` | — | manual | M |
| TC-NFR-04 | OWASP ZAP baseline scan *(optional)* | S04 | Non-functional | P3 | NFR3 · AC H-2 | No High alerts | — | manual | M |
| TC-UI-16 | Visual match with the Stitch design | S04 | UI + Manual | P2 | US-16 AC1 · AC H-2 | Screenshot S3, S4, S5 and S10 with the demo seed; compare side by side with `docs/design/*/screen.png` (project: mobile (390×844) + desktop (1280)) | Layout, colours, fonts and components match; differences are either listed as decisions D1–D21 or logged as bugs | `e2e/sprint04/admin.spec.ts` (screenshots saved; compare with `docs/design/*/screen.png`) | M |
