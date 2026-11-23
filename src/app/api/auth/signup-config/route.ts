import { route } from '@/server/http/route';
import { allowedDomainsOf, getSettings } from '@/server/services/settingsService';

export const dynamic = 'force-dynamic';

/** Public: the allowed sign-up domains, so the S2 form can validate before submitting. */
export const GET = route({ public: true }, async () => ({ allowedDomains: allowedDomainsOf(await getSettings()) }));
