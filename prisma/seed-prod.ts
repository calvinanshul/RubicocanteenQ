import { PrismaClient } from '@prisma/client';
import { seedProductionFromEnv } from './seedAdmin';

/**
 * Production bootstrap (`npm run db:seed:prod`), run by the Render start command after `prisma migrate deploy`.
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME / ALLOWED_EMAIL_DOMAINS from the service environment.
 * No demo data. See seedProductionFromEnv for what it does on first and later starts.
 */
const prisma = new PrismaClient();
async function main() {
  const r = await seedProductionFromEnv(prisma, process.env as Record<string, string | undefined>);
  if (r.settingsCreated) {
    console.log(`Settings created${r.domains ? ` with sign-up domains ${r.domains.map((d) => `@${d}`).join(', ')}` : ''}.`);
  }
  const admin = {
    skipped: 'No ADMIN_EMAIL/ADMIN_PASSWORD set; an active admin already exists.',
    created: `Admin ${r.admin.email} created.`,
    promoted: `Account ${r.admin.email} is now an active admin (password unchanged).`,
    unchanged: `Admin ${r.admin.email} already exists (password unchanged).`,
  } as const;
  console.log(`Production seed complete. ${admin[r.admin.status]}`);
}
main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
