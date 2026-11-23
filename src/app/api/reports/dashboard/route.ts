import { z } from 'zod';
import { dateSchema } from '@/shared';
import { now, todayIST } from '@/server/adapters/clock';
import { route } from '@/server/http/route';
import { dashboard } from '@/server/services/reportService';

export const dynamic = 'force-dynamic';

/** R1: MANAGER and ADMIN (admin read-only by having no write actions). */
export const GET = route({ roles: ['MANAGER', 'ADMIN'], query: z.object({ date: dateSchema.optional() }) }, ({ query, testNow }) =>
  dashboard(query.date ?? todayIST(now({ testNow })), now({ testNow })),
);
