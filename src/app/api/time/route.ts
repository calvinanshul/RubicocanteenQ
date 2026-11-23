import { now, todayIST } from '@/server/adapters/clock';
import { route } from '@/server/http/route';

export const dynamic = 'force-dynamic';

/**
 * X3: the server's clock (honours the test clock), so the UI never decides "today" or the cut-off from the
 * device clock (BR1, BUG-03-001). Public: it reveals nothing but the time.
 */
export const GET = route({ public: true }, ({ testNow }) => {
  const instant = now({ testNow });
  return Response.json({ serverTime: instant.toISOString(), today: todayIST(instant) }, { headers: { 'Cache-Control': 'no-store' } });
});
