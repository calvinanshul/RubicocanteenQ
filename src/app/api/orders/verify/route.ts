import { z } from 'zod';
import { pickupCodeSchema } from '@/shared';
import { now } from '@/server/adapters/clock';
import { route } from '@/server/http/route';
import { verifyCode } from '@/server/services/staffService';

/** Q3: look up a pickup code (case-insensitive, trimmed). */
export const POST = route({ roles: ['STAFF'], body: z.object({ pickupCode: pickupCodeSchema }) }, ({ body, testNow }) =>
  verifyCode(body.pickupCode, now({ testNow })),
);
