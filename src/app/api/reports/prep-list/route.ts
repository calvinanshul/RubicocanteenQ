import { z } from 'zod';
import { dateSchema } from '@/shared';
import { now, todayIST } from '@/server/adapters/clock';
import { route } from '@/server/http/route';
import { prepList } from '@/server/services/reportService';

export const dynamic = 'force-dynamic';

/** R2: STAFF only (the queue & prep section is not part of the manager console). */
export const GET = route({ roles: ['STAFF'], query: z.object({ date: dateSchema.optional() }) }, ({ query, testNow }) =>
  prepList(query.date ?? todayIST(now({ testNow }))),
);
