import { now } from '@/server/adapters/clock';
import { route } from '@/server/http/route';
import { idParams } from '@/server/http/schemas';
import { getOrderDto } from '@/server/services/orderService';

export const dynamic = 'force-dynamic';

/** O3: one order. Owner (EMPLOYEE) or STAFF; anyone else gets 404. Managers have no counter access. */
export const GET = route({ roles: ['EMPLOYEE', 'STAFF'], params: idParams }, ({ params, user, testNow }) =>
  getOrderDto(params.id, user, now({ testNow })),
);
