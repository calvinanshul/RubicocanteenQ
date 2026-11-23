import { z } from 'zod';
import { monthSchema } from '@/shared';
import { csvResponse } from '@/server/http/csv';
import { route } from '@/server/http/route';
import { statementCsv } from '@/server/services/exportService';

export const dynamic = 'force-dynamic';

/** R4: monthly statement per employee. MANAGER and ADMIN. */
export const GET = route({ roles: ['MANAGER', 'ADMIN'], query: z.object({ month: monthSchema }) }, async ({ query: { month } }) =>
  csvResponse(`statement_${month}.csv`, await statementCsv(month)),
);
