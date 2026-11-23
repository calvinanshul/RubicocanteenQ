# Stage 7e — Non-functional Test: Pre-cut-off Ordering Rush (Load)

| | |
|---|---|
| **Test IDs** | TC-NFR-01 (performance), TC-NFR-02 (data integrity) |
| **Requirements** | NFR1: `POST /api/orders` p95 < 800 ms and error rate < 1% at 100 concurrent users · NFR2: zero overselling |
| **Tool** | [k6](https://k6.io) (open-source, scriptable, pass/fail thresholds) |
| **Target** | **Staging**: Netlify deploy preview (with the `/api` proxy) + a separate staging Render API service + Neon dev branch (never production) |

## 1. Why this scenario

Assumption A10: most orders arrive in the **10 minutes before the 11:00 cut-off**. This is the moment that matters most for both latency (users are rushing) and correctness (popular dishes sell out, so concurrent requests compete for the last portions). The scenario deliberately **under-stocks one dish** so that oversell protection is tested under real load.

## 2. Workload model

| Parameter | Value |
|---|---|
| Virtual users (VUs) | Ramp 0 → 50 (1 min) → **100** (hold 3 min) → 0 (30 s) |
| User journey per iteration | Log in (once per VU) → GET daily menu → GET slots → POST order → GET my orders → cancel (50% of the time, to recycle the one-order-per-day rule) → think time 1–3 s |
| Test data | 100 pre-created employees (`loadtest001…100@rubicotech.com`); today's menu with 5 dishes; **"Veg Biryani" quantity = 50** (deliberately scarce) |
| Clock | `ENABLE_TEST_CLOCK=true` on the **staging API only**; requests send `x-test-now: <date>T10:50:00+05:30` |

## 3. Pass/fail criteria (k6 thresholds)

| Metric | Threshold |
|---|---|
| `http_req_duration{name:place_order}` p95 | < 800 ms |
| `http_req_duration{name:get_menu}` p95 | < 400 ms |
| `http_req_failed` (unexpected 5xx / network errors) | < 1% |
| `checks` | > 99% |
| **DB invariant after the run** | `SELECT count(*) FROM "DailyMenuItem" WHERE "orderedQty" > "quantity"` = **0**, and for each item, the sum of active order quantities = `orderedQty` |

> 409 `OUT_OF_STOCK` and `ORDER_EXISTS_FOR_DATE` are **expected** business responses, not failures. They are excluded from `http_req_failed` using `responseCallback`.

## 4. Script (`backend/tests/perf/order-rush.js`)

```js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const BASE = __ENV.BASE_URL;                       // e.g. https://deploy-preview-12--canteenq.netlify.app (requests go through the /api proxy, as real users' do)
const DATE = __ENV.TEST_DATE;                      // e.g. 2026-11-17
const NOW  = `${DATE}T10:50:00+05:30`;
const H    = { 'Content-Type': 'application/json', 'x-test-now': NOW };

export const options = {
  scenarios: {
    rush: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_duration{name:place_order}': ['p(95)<800'],
    'http_req_duration{name:get_menu}':    ['p(95)<400'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

// 409 is an expected business outcome, not a failure
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 299 }, 409));

export function setup() {
  // Warm-up: avoid measuring cold starts
  for (let i = 0; i < 10; i++) {
    const r = http.get(`${BASE}/api/health`, { timeout: '90s' });
    if (r.status === 200) return;
    sleep(5);
  }
  throw new Error('Target not healthy');
}

export default function () {
  const email = `loadtest${String(__VU).padStart(3, '0')}@rubicotech.com`;
  if (__ITER === 0) {
    const login = http.post(`${BASE}/api/auth/login`,
      JSON.stringify({ email, password: __ENV.LOADTEST_PASSWORD }), { headers: H, tags: { name: 'login' } });
    check(login, { 'login 200': r => r.status === 200 });
  }

  const menu = http.get(`${BASE}/api/daily-menu?date=${DATE}`, { headers: H, tags: { name: 'get_menu' } });
  check(menu, { 'menu 200': r => r.status === 200 });
  const items = menu.json('items') || [];
  const available = items.filter(i => i.remaining > 0);
  // 60% try the scarce dish to create contention
  const pick = Math.random() < 0.6
    ? items.find(i => i.name === 'Veg Biryani')
    : available[Math.floor(Math.random() * available.length)];
  if (!pick) { sleep(1); return; }

  const slots = http.get(`${BASE}/api/slots?date=${DATE}`, { headers: H, tags: { name: 'get_slots' } });
  const open = (slots.json() || []).filter(s => s.available);
  const slot = open[Math.floor(Math.random() * open.length)];

  const res = http.post(`${BASE}/api/orders`, JSON.stringify({
      date: DATE, slotStart: slot.start, items: [{ dailyMenuItemId: pick.dailyMenuItemId, qty: 1 }],
    }), { headers: { ...H, 'Idempotency-Key': uuidv4() }, tags: { name: 'place_order' } });

  check(res, {
    'order 201 or expected 409': r => r.status === 201 || r.status === 409,
    'no 5xx': r => r.status < 500,
  });

  if (res.status === 201 && Math.random() < 0.5) {
    const id = res.json('id');
    http.post(`${BASE}/api/orders/${id}/cancel`, null, { headers: H, tags: { name: 'cancel' } });
  }
  http.get(`${BASE}/api/orders/me`, { headers: H, tags: { name: 'my_orders' } });
  sleep(1 + Math.random() * 2);
}
```

**Run**
```bash
k6 run -e BASE_URL=https://<deploy-preview>--<site>.netlify.app -e TEST_DATE=2026-11-17 \
       -e LOADTEST_PASSWORD=*** --summary-export=docs/perf/summary.json backend/tests/perf/order-rush.js
```

**Post-run integrity check (TC-NFR-02)**
```sql
-- 1. No item oversold
SELECT id, quantity, "orderedQty" FROM "DailyMenuItem"
WHERE "menuDate" = '2026-11-17' AND "orderedQty" > quantity;          -- expect 0 rows

-- 2. Counter matches the actual active orders
SELECT d.id, d."orderedQty", COALESCE(SUM(oi.qty),0) AS actual
FROM "DailyMenuItem" d
LEFT JOIN "OrderItem" oi ON oi."dailyMenuItemId" = d.id
LEFT JOIN "Order" o ON o.id = oi."orderId" AND o.status <> 'CANCELLED'
WHERE d."menuDate" = '2026-11-17'
GROUP BY d.id HAVING d."orderedQty" <> COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.qty END),0);  -- expect 0 rows

-- 3. No employee with two active orders
SELECT "userId", COUNT(*) FROM "Order"
WHERE "orderDate" = '2026-11-17' AND status <> 'CANCELLED'
GROUP BY "userId" HAVING COUNT(*) > 1;                                -- expect 0 rows
```

## 5. Results *(fill in after running; paste the k6 summary into `docs/perf/`)*

**Run date / environment:** _<date, Netlify preview URL, Render service region, Neon region>_

| Metric | Threshold | Result | Pass? |
|---|---|---|---|
| place_order p95 | < 800 ms | | |
| place_order p99 | (info) | | |
| get_menu p95 | < 400 ms | | |
| http_req_failed | < 1% | | |
| checks | > 99% | | |
| Total requests / RPS | (info) | | |
| 201 orders / 409 OUT_OF_STOCK | (info) | | |
| Oversold items (SQL 1) | 0 | | |
| Counter mismatches (SQL 2) | 0 | | |
| Duplicate active orders (SQL 3) | 0 | | |

**Observations:** _e.g. the first requests were slow because of a cold start, or DB connections hit their limit. Was the pooled URL used?_

**Actions taken:** _e.g. added an index on (orderDate, slotStart, status); p95 went from X to Y ms. Log any bugs in `07-bug-log.md`._

**Conclusion:** _NFR1 met / not met; NFR2 met / not met._

## 6. Limitations

- Free-tier serverless and database performance varies between runs, so run the test **3 times** and report the median.
- 100 VUs is a pilot-scale test, not a capacity test of the whole office. The 300-user stretch target (A10) is a separate run if time allows.
- The test runs from a single location (your laptop or k6 Cloud's free tier). Network latency is included in the results.
- The free Render API runs on a small shared instance, and the Netlify proxy adds a network hop. Results show the **free-tier pilot** set-up, not production capacity; record both facts next to the numbers.
- The warm-up in `setup()` keeps cold starts out of the measurements. Report the cold-start time separately if you measure it.
