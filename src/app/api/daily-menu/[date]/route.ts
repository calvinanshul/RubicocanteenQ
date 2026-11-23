import { z } from 'zod';
import { dailyMenuPutSchema, dateSchema } from '@/shared';
import { now } from '@/server/adapters/clock';
import { route } from '@/server/http/route';
import { putDailyMenu } from '@/server/services/dailyMenuService';

/** M5: manager replaces the menu for a date */
export const PUT = route(
  { roles: ['MANAGER'], params: z.object({ date: dateSchema }), body: dailyMenuPutSchema },
  ({ params, body, testNow }) => putDailyMenu(params.date, body, now({ testNow })),
);
