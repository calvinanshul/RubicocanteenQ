# 16 · CSV exports

Orders CSV, monthly statement, formula-injection safety (US-17, S16, R3–R4).

Sprints: S04 · Cases: 15 (4 test cases, 11 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-API-RPT-03 | CSV export | S04 | API | P2 | US-17 AC1/AC2 · AC 15-1 | Export 1–30 Nov; range 120 days; `from > to` | 200 `text/csv` with correct headers and filename; 400; 400 | `api/sprint04/canteen.test.ts` | ✅ |
| TC-API-RPT-04 | CSV formula injection | S04 | API | P2 | US-17 AC3 · AC 15-1 | User named `=HYPERLINK("x")` orders; export | The cell starts with `'=` | `api/sprint04/canteen.test.ts` | ✅ |
| TC-U-13 | CSV escaping | S04 | Unit | P2 | US-17 AC3 · AC 15-1 | `=SUM(A1)`, `+1`, `-1`, `@x`, `a,"b"` | `'=SUM(A1)`, `'+1`, `'-1`, `'@x`, `"a,""b"""` | `api-u/sprint04.csv.test.ts` | ✅ |
| TC-UI-14 | CSV download | S04 | UI | P3 | US-17 AC1 · AC 15-1 | Click Export CSV (project: desktop) | A download event fires with filename `orders_*.csv` | `e2e/sprint04/admin.spec.ts` | ✅ |
| EC-04-07 | CSV range 92 vs 93 days | S04 | API | P2 | — | Input as in the title | 200 / 400 | `api/sprint04/canteen.test.ts` | ✅ |
| EC-04-08 | Monthly statement: columns, code, no-show billed, cancelled not | S04 | API | P2 | — | Input as in the title | row `…,2,200` | `api/sprint04/canteen.test.ts` | ✅ |
| EC-04-09 | EMPLOYEE / STAFF export | S04 | API | P2 | — | Input as in the title | 403 | `api/sprint04/canteen.test.ts` | ✅ |
| EC-04-U1 | CSV cell starting with tab + `=` | S04 | Unit | P2 | — | Input as in the title | neutralised | `api-u/sprint04.csv.test.ts` | ✅ |
| EC-04-U2 | Numbers, null, undefined | S04 | Unit | P2 | — | Input as in the title | `120,,` | `api-u/sprint04.csv.test.ts` | ✅ |
| EC-04-U3 | Header follows the column order | S04 | Unit | P2 | — | Input as in the title | `date,order_id` | `api-u/sprint04.csv.test.ts` | ✅ |
| EC-04-12 | Statement month edges and formula names | S04 | API | P2 | US-17 AC3 · AC 15-1 | Orders on 31 Dec and 1 Jan; name `+Formula Person` | Dec row `…,1,200.00`; Jan separate; name cell `'+Formula…`; file `statement_2030-12.csv` | `api/sprint04/probes.test.ts` | ✅ |
| EC-04-13 | Orders CSV row format | S04 | API | P2 | US-17 AC1 · AC 15-1 | Cancelled 2 × dish at ₹120, slot 13:00 | `date,id,code,name,email,2 x Dish,240.00,CANCELLED,13:00-13:15` | `api/sprint04/probes.test.ts` | ✅ |
| EC-04-UI7 | Export range over 92 days in the form | S04 | UI | P2 | US-17 AC2 · AC 15-1 | From 2020-01-01 to today; Download CSV | "Date range must be 1–92 days"; no request sent | `web/test/sprint04-probes.test.tsx` | ✅ |
| EC-04-UI8 | Export server error | S04 | UI | P3 | US-17 · AC 15-1 | Statement API answers 500 | Error shown on the card | `web/test/sprint04-probes.test.tsx` | ✅ |
| EC-04-UI9 | Statement download | S04 | UI | P2 | US-17 · AC 15-1 | Admin → Exports → second Download CSV (project: desktop) | `statement_YYYY-MM.csv` with the R4 header | `e2e/sprint04/probes.spec.ts` | ✅ |
