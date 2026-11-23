import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { seedAdminFromEnv, seedAllowedDomainsFromEnv } from './seedAdmin';
import { seed } from './seedData';

// The project-level .env (repo root) holds ADMIN_EMAIL / ADMIN_PASSWORD. Values already set are not overridden.
const rootEnv = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const prisma = new PrismaClient();
async function main() {
  await seed(prisma);
  const domains = await seedAllowedDomainsFromEnv(prisma, process.env as Record<string, string | undefined>);
  if (domains) console.log(`Sign-up email domains: ${domains.map((d) => `@${d}`).join(', ')}`);
  const admin = await seedAdminFromEnv(prisma, process.env as Record<string, string | undefined>);
  const notes = {
    skipped: 'No ADMIN_EMAIL/ADMIN_PASSWORD in .env: only the demo accounts were seeded.',
    created: `Admin ${admin.email} created.`,
    promoted: `Existing account ${admin.email} is now an active admin (password unchanged).`,
    unchanged: `Admin ${admin.email} already exists (password unchanged).`,
  } as const;
  console.log(`Seed complete. ${notes[admin.status]}`);
}
main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
