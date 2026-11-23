import { usersQuerySchema } from '@/shared';
import { route } from '@/server/http/route';
import { listUsers } from '@/server/services/userService';

export const dynamic = 'force-dynamic';

/** U1 */
export const GET = route({ roles: ['ADMIN'], query: usersQuerySchema }, ({ query }) => listUsers(query));
