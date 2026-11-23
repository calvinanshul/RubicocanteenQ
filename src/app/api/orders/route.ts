import { z } from 'zod';
import { dateSchema, makeOrderSchema, ORDER_STATUSES } from '@/shared';
import { now, todayIST } from '@/server/adapters/clock';
import { json, parseOrThrow, route } from '@/server/http/route';
import { placeOrder } from '@/server/services/orderService';
import { getSettings } from '@/server/services/settingsService';
import { getQueue, type QueueFilter } from '@/server/services/staffService';

export const dynamic = 'force-dynamic';

/** O1: place an order (EMPLOYEE). Idempotency-Key header makes retries safe (US-09 AC9). */
export const POST = route({ roles: ['EMPLOYEE'] }, async ({ req, body: raw, user, testNow }) => {
  const settings = await getSettings();
  const body = parseOrThrow(makeOrderSchema(settings.maxQtyPerItem), raw);
  const key = req.headers.get('Idempotency-Key')?.trim() || undefined;
  const { order, created } = await placeOrder(user.id, body, key, now({ testNow }));
  return json(order, { status: created ? 201 : 200 });
});

const queueQuery = z.object({
  date: dateSchema.optional(),
  status: z.enum([...ORDER_STATUSES, 'ISSUES'] as [string, ...string[]]).optional(),
});

/** Q1: the staff queue for a date (default: today on the server clock), grouped by slot. */
export const GET = route({ roles: ['STAFF'], query: queueQuery }, ({ query, testNow }) =>
  getQueue(query.date ?? todayIST(now({ testNow })), query.status as QueueFilter | undefined, now({ testNow })),
);
