# Sprint 03 · Counter & Kitchen

**Goal:** The full lunch loop works end to end: staff prepare orders by slot, scan the QR and hand over once; the kitchen has a prep list; the manager sees today's numbers.
**Stories:** ST-06 (5) · ST-07 (5) · ST-09 (5) · ST-13 (2) = 17 pts · Source: `06-sprint-plan.md §4`

## Acceptance criteria

| AC | Criterion | Tests |
|---|---|---|
| 06-1 | BR7 status machine: only the allowed transitions | TC-U-07 |
| 06-2 | US-12 AC1–AC5: S7 queue grouped by slot with "Now serving", counts, Start / Mark ready; cancelled orders greyed; polled every 15 s | TC-API-STF-01..03, TC-UI-15 |
| 07-1 | US-13 AC1–AC8: S8 scan (camera + typed code), single use, wrong date / cancelled / not found / not-ready warning | TC-API-STF-05..10, TC-UI-10 |
| 13-1 | US-12 AC6: S9 prep list, excluding cancelled orders; print | TC-API-STF-04 |
| 09-1 | US-14 AC1–AC7: S10 dashboard with 6 KPIs (vs yesterday, avg, collected %), items to prepare, slot bars, empty state, admin read-only | TC-API-RPT-01, 02, 05, TC-UI-13 |
| 09-2 | Demo seed matching the mockups (`db:seed:demo`) | Visual compare |
| X-1 | Golden-path E2E (employee → staff → collected → dashboard) on desktop and mobile | TC-UI-06 |
