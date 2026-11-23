import { z } from 'zod';
import { dateSchema } from '@/shared';
import { now } from '@/server/adapters/clock';
import { route } from '@/server/http/route';
import { getDailyMenu } from '@/server/services/dailyMenuService';

export const dynamic = 'force-dynamic';

/** M4: any logged-in user */
export const GET = route({ query: z.object({ date: dateSchema }) }, ({ query, testNow }) => getDailyMenu(query.date, now({ testNow })));
