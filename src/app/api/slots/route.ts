import { z } from 'zod';
import { dateSchema } from '@/shared';
import { route } from '@/server/http/route';
import { listSlots } from '@/server/services/orderService';

export const dynamic = 'force-dynamic';

/** M6: pickup slots with booked / capacity / available (US-19). Any logged-in user. */
export const GET = route({ query: z.object({ date: dateSchema }) }, ({ query }) => listSlots(query.date));
