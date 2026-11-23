import { now } from '@/server/adapters/clock';
import { route } from '@/server/http/route';
import { idParams } from '@/server/http/schemas';
import { cancelOrder } from '@/server/services/orderService';

/** O5: cancel my order before the cut-off (US-10). */
export const POST = route({ roles: ['EMPLOYEE'], params: idParams }, ({ params, user, testNow }) => cancelOrder(params.id, user.id, now({ testNow })));
