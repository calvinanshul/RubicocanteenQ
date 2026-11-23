import { route } from '@/server/http/route';

export const dynamic = 'force-dynamic';

/** A4 */
export const GET = route({}, ({ user }) => user);
