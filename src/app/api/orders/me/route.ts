import { z } from 'zod';
import { dateSchema } from '@/shared';
import { now } from '@/server/adapters/clock';
import { route } from '@/server/http/route';
import { listMyOrders } from '@/server/services/orderService';

export const dynamic = 'force-dynamic';

const meQuery = z.object({ page: z.coerce.number().int().min(1).max(10_000).default(1), date: dateSchema.optional() });

/** O2: my orders, newest first (EMPLOYEE). */
export const GET = route({ roles: ['EMPLOYEE'], query: meQuery }, ({ query, user, testNow }) => listMyOrders(user.id, query, now({ testNow })));
