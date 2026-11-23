// TC-NFR-01 / TC-NFR-02: pre-cut-off ordering rush (Sprint 04, H5). Source: docs/07-non-functional-test.md §4.
// Run against STAGING only (ENABLE_TEST_CLOCK=true there, never production):
//   k6 run -e BASE_URL=https://<preview>.netlify.app -e TEST_DATE=YYYY-MM-DD -e LOADTEST_PASSWORD=*** \
//          --summary-export=docs/perf/summary.json backend/tests/perf/order-rush.js
// Then run backend/tests/perf/oversell-checks.sql against the staging DB; every query must return 0 rows.
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
  // Warm-up: the free API host sleeps when idle; wake it before measuring
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
