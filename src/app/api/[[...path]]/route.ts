import { notFound, route } from '@/server/http/route';

export const dynamic = 'force-dynamic';

/** Any other /api path: the standard JSON 404 (never the HTML not-found page). */
const handler = route({ public: true }, () => notFound());
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
