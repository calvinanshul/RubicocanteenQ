# 13 · Prep list and dashboard

Prep list and manager dashboard KPIs (US-12 AC6, US-14, S9, S10, R1–R2).

Sprints: S03 · Cases: 14 (5 test cases, 9 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-API-RPT-01 | Dashboard numbers | S03 | API | P1 | US-14 AC1–4, AC7 · AC 09-1 | Seed a known set (10 orders: 6 collected, 2 pending, 1 cancelled, 1 no-show) | KPIs match exactly; revenue excludes cancelled orders; items and slot counts correct; ADMIN gets the same data | `api/sprint03/counter.test.ts` | ✅ |
| TC-API-RPT-02 | Dashboard access and empty day | S03 | API | P1 | US-14 AC5/AC6 · AC 09-1 | EMPLOYEE call; a date with no orders | 403; all zeros, empty arrays | `api/sprint03/counter.test.ts` | ✅ |
| TC-API-RPT-05 | Dashboard extras from the design | S03 | API | P1 | US-14 AC1/AC2 · AC 09-1 | Seed 10 orders today (total ₹1,150, 6 collected) and 8 yesterday | `avgOrderPaise` 11500; `collectedPct` 60.0; `vsYesterdayPct` 25.0; `peakSlot` = busiest slot; `capacityPerSlot` from settings; item `remaining`/`soldOut` correct | `api/sprint03/counter.test.ts` | ✅ |
| TC-API-STF-04 | Prep list | S03 | API | P1 | US-12 AC6 · AC 13-1 | 3 orders (1 cancelled) | Totals exclude the cancelled order | `api/sprint03/counter.test.ts` | ✅ |
| TC-UI-13 | Dashboard | S03 | UI | P2 | US-14 AC1/AC4/AC6 · AC 09-1 | Open the dashboard; change to a date with no orders (project: desktop) | 6 KPI tiles; the empty state is shown | `e2e/sprint03/counter.spec.ts` | ✅ |
| EC-03-09 | Monday with no Friday orders | S03 | API | P2 | — | Input as in the title | `vsYesterdayPct: null` | `api/sprint03/counter.test.ts` | ✅ |
| EC-03-10 | Dish fully ordered | S03 | API | P2 | — | Input as in the title | `remaining 0, soldOut true` | `api/sprint03/counter.test.ts` | ✅ |
| EC-03-11 | Report bad date; no session | S03 | API | P2 | — | Input as in the title | 400; 401 | `api/sprint03/counter.test.ts` | ✅ |
| EC-03-UI1 | Prep list page | S03 | UI | P2 | — | Input as in the title | dish names + Print button | `e2e/sprint03/counter.spec.ts` | ✅ |
| EC-03-12 | Peak-slot tie goes to the earliest slot | S03 | API | P2 | — | 2 orders at 13:30, 2 at 12:45 | peakSlot 12:45 | `api/sprint03/counter.test.ts` | ✅ |
| EC-03-19 | collectedPct to 1 decimal; negative vs-yesterday | S03 | API | P2 | — | 1 of 3 collected; 3 today vs 6 previous day | 33.3; -50; integer average | `api/sprint03/probes.test.ts` | ✅ |
| EC-03-UI9 | Prep list totals, sold-out tile, print | S03 | UI | P2 | — | 68/80 and 30/30 | "Total 98 portions"; Sold out; "12 unsold"; window.print called | `web/test/sprint03-probes.test.tsx` | ✅ |
| EC-03-UI10 | Admin dashboard is read-only | S03 | UI | P2 | — | ADMIN, empty day | "Read-only"; no prep link; empty state; "No orders on the previous day" | `web/test/sprint03-probes.test.tsx` | ✅ |
| EC-03-UI11 | Changing the date reloads that date | S03 | UI | P2 | — | Set the date input to 2030-05-14 | R1 called with date=2030-05-14 | `web/test/sprint03-probes.test.tsx` | ✅ |
