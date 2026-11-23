import { statusChangeSchema } from '@/shared';
import { now } from '@/server/adapters/clock';
import { route } from '@/server/http/route';
import { idParams } from '@/server/http/schemas';
import { changeStatus } from '@/server/services/staffService';

/** Q2: Start / Mark ready / No-show. COLLECTED is only possible through Q4. */
export const PATCH = route({ roles: ['STAFF'], params: idParams, body: statusChangeSchema }, ({ params, body, user, testNow }) =>
  changeStatus(params.id, body.status, user.id, now({ testNow })),
);
