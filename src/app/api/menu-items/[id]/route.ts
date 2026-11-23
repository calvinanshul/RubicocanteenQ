import { menuItemPatchSchema } from '@/shared';
import { route } from '@/server/http/route';
import { idParams } from '@/server/http/schemas';
import { updateMenuItem } from '@/server/services/menuService';

/** M3: any subset of M2 fields + isActive (archive / restore). */
export const PATCH = route({ roles: ['MANAGER'], params: idParams, body: menuItemPatchSchema.strict() }, ({ params, body, user }) =>
  updateMenuItem(params.id, body, user.id),
);
