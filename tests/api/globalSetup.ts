import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { seed } from '../../prisma/seedData';
import { TEST_DATABASE_URL, TEST_ENV } from '../testDb';

/** Migrate and reset the test database once per run, then load the base seed. */
export default async function setup(): Promise<void> {
  const dbName = new URL(TEST_DATABASE_URL).pathname.slice(1);
  if (!dbName.includes('test')) throw new Error(`Refusing to reset non-test database "${dbName}"`);

  execSync('npx prisma migrate deploy', { env: { ...process.env, ...TEST_ENV }, stdio: 'pipe' });
  const prisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });
  try {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "OrderItem", "Order", "DailyMenuItem", "MenuItem", "AuditLog", "ClosedDate", "User", "Settings" RESTART IDENTITY CASCADE',
    );
    await seed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
