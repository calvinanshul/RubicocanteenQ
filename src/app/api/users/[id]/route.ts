import { userPatchSchema } from '@/shared';
import { route } from '@/server/http/route';
import { idParams } from '@/server/http/schemas';
import { updateUser } from '@/server/services/userService';

/** U2 */
export const PATCH = route({ roles: ['ADMIN'], params: idParams, body: userPatchSchema }, ({ params, body, user }) =>
  updateUser(params.id, body, user.id),
);
