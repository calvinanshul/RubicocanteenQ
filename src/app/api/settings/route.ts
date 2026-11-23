import { settingsSchema } from '@/shared';
import { route } from '@/server/http/route';
import { getSettings, saveSettings, toPublicSettings } from '@/server/services/settingsService';

export const dynamic = 'force-dynamic';

/** S1: any logged-in user; allowedDomains only for ADMIN. */
export const GET = route({}, async ({ user }) => toPublicSettings(await getSettings(), user.role === 'ADMIN'));

/** S2: ADMIN only (D19). Cross-field rules live in the shared schema (US-05 AC2–AC4). */
export const PUT = route({ roles: ['ADMIN'], body: settingsSchema }, ({ body, user }) => saveSettings(body, user.id));
