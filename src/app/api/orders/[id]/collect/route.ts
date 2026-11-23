import { now } from '@/server/adapters/clock';
import { route } from '@/server/http/route';
import { idParams } from '@/server/http/schemas';
import { collectOrder } from '@/server/services/staffService';

/** Q4: hand over (single use). */
export const POST = route({ roles: ['STAFF'], params: idParams }, ({ params, user, testNow }) => collectOrder(params.id, user.id, now({ testNow })));
