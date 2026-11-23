import { z } from 'zod';

/** `/:id` path parameter: a positive 32-bit integer. */
export const idParams = z.object({ id: z.coerce.number().int().positive().max(2_147_483_647) });
