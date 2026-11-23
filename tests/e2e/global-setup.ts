import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { E2E_DATABASE_URL } from '../../playwright.config';

/** Migrate, reset and seed the E2E database, then add the fixtures the specs rely on. */
export default async function globalSetup(): Promise<void> {
  const dbName = new URL(E2E_DATABASE_URL).pathname.slice(1);
  if (!dbName.includes('e2e') && !dbName.includes('test')) throw new Error(`Refusing to reset "${dbName}"`);
  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL, DIRECT_URL: E2E_DATABASE_URL };
  const root = fileURLToPath(new URL('../..', import.meta.url));
  execSync('npx prisma migrate deploy', { cwd: root, env, stdio: 'pipe' });
  execSync('npx tsx tests/seed-e2e.ts', { cwd: root, env, stdio: 'inherit' });
}
