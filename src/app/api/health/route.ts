import { prisma } from '@/server/db';
import { route } from '@/server/http/route';

export const dynamic = 'force-dynamic';

/** X1: used by the host's health check and the demo warm-up. */
export const GET = route({ public: true }, async () => {
  const time = new Date().toISOString();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', db: 'ok', time };
  } catch {
    return Response.json({ status: 'error', db: 'down', time }, { status: 503 });
  }
});
