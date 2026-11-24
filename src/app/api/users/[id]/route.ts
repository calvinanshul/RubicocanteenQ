import { userPatchSchema } from '@/shared';
import { runAfterResponse } from '@/server/http/background';
import { route } from '@/server/http/route';
import { idParams } from '@/server/http/schemas';
import { sendRoleChangedEmail } from '@/server/services/emailService';
import { updateUser } from '@/server/services/userService';

/** U2. A role change also emails the user, after the response (it never delays or fails the update). */
export const PATCH = route({ roles: ['ADMIN'], params: idParams, body: userPatchSchema }, async ({ params, body, user, config, log }) => {
  const { user: updated, previousRole } = await updateUser(params.id, body, user.id);
  if (previousRole) {
    runAfterResponse(() => sendRoleChangedEmail(updated, previousRole, updated.role, config.WEB_ORIGIN, log));
  }
  return updated;
});
