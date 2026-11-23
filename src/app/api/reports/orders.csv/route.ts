import { exportRangeSchema } from '@/shared';
import { csvResponse } from '@/server/http/csv';
import { route } from '@/server/http/route';
import { ordersCsv } from '@/server/services/exportService';

export const dynamic = 'force-dynamic';

/** R3: orders in a date range (1–92 days inclusive). MANAGER and ADMIN. */
export const GET = route({ roles: ['MANAGER', 'ADMIN'], query: exportRangeSchema }, async ({ query: { from, to } }) =>
  csvResponse(`orders_${from}_${to}.csv`, await ordersCsv(from, to)),
);
