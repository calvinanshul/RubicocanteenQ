# 09 · Order pass, QR and cancel

Pickup pass, real QR, order ownership, cancel and re-order (US-10, US-11, S5, O3–O5).

Sprints: S02 · Cases: 15 (5 test cases, 10 edge cases) · Back to [all test cases](../TEST-CASES.md) · Selector and module contracts: [contracts.md](../contracts.md)

| ID | Title | Sprint | Level | Pri | Story / AC | Steps / input | Expected | Script › test | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-API-ORD-10 | Cancel before cut-off | S02 | API | P1 | US-10 AC1 · AC 08-1 | Place 2 at 10:00; cancel at 10:40 | 200 `CANCELLED`; `remaining` back up by 2 | `api/sprint02/orders.test.ts` | ✅ |
| TC-API-ORD-11 | Cancel rejected | S02 | API | P1 | US-10 AC2–4 · AC 08-1 | Cancel at 11:05; cancel twice; cancel another user's order | 409 `CUTOFF_PASSED`; 409 `INVALID_STATUS`; 404 | `api/sprint02/orders.test.ts` | ✅ |
| TC-API-ORD-12 | Re-order after cancel | S02 | API | P1 | US-10 AC1 · BR4 · AC 08-1 | Place → cancel → place again the same day | 201 (the partial unique index allows it) | `api/sprint02/orders.test.ts` | ✅ |
| TC-API-ORD-14 | QR content | S02 | API | P1 | US-11 AC4 · AC 05-1 | GET `/qr`; decode the PNG (jsQR) | Decoded text equals `pickupCode` only (no ID, email or name) | `api/sprint02/orders.test.ts` (decoded with jsQR) | ✅ |
| TC-UI-09 | Cancel order | S02 | UI | P1 | US-10 AC1 · AC 08-1 | Cancel → confirm the dialog (project: mobile) | Status CANCELLED; menu stock increases | `e2e/sprint02/ordering.spec.ts` | ✅ |
| EC-02-13 | Order id `abc`, `-1`, `1.5`, huge | S02 | API | P2 | — | Input as in the title | 400/404, never 500 | `api/sprint02/orders.test.ts` | ✅ |
| EC-02-15 | Cancel twice | S02 | API | P2 | — | Input as in the title | stock restored once only | `api/sprint02/orders.test.ts` (in TC-API-ORD-11) | ✅ |
| EC-02-16 | Employee cancels a READY order | S02 | API | P2 | — | Input as in the title | 409 `INVALID_STATUS` | `api/sprint02/orders.test.ts` | ✅ |
| EC-02-17 | Deactivated employee reads their order | S02 | API | P2 | — | Input as in the title | 401 | `api/sprint02/orders.test.ts` | ✅ |
| EC-02-18 | Cancel tomorrow's order after today's cut-off | S02 | API | P2 | — | Place for tomorrow at 16:30 today; cancel at 16:40 | 200; stock restored | `api/sprint02/probes.test.ts` | ✅ |
| EC-02-21 | Two parallel cancels | S02 | API | P2 | — | Two cancel requests at once | one 200, one 409; stock restored once | `api/sprint02/probes.test.ts` | ✅ |
| EC-02-UI12 | READY pass: green message, code, QR src, copy; no Cancel | S02 | UI | P2 | — | Order READY, after cut-off | "Your lunch is ready!", code + QR, clipboard gets code, amber "can no longer be changed" note | `web/test/sprint02-probes.test.tsx` | ✅ |
| EC-02-UI13 | Cancelled pass hides QR and code | S02 | UI | P2 | — | Order CANCELLED | cancelled message; no QR, no code | `web/test/sprint02-probes.test.tsx` | ✅ |
| EC-02-UI14 | Missing or not-mine order | S02 | UI | P2 | — | Open /orders/999 | "Order not found" | `web/test/sprint02-probes.test.tsx` | ✅ |
| EC-02-UI15 | "In N mins" from server time | S02 | UI | P2 | — | Server 10:30 IST, slot 13:00 | "In 2 h 30 mins" | `web/test/sprint02-probes.test.tsx` | ✅ |
