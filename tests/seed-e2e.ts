import { PrismaClient } from '@prisma/client';
import { seed } from '../prisma/seedData';
import { addDays, dbDate, todayIST } from '@/server/adapters/clock';

/** Reset + seed for Playwright (run by tests/e2e/global-setup.ts with DATABASE_URL = the E2E DB). */
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "OrderItem", "Order", "DailyMenuItem", "MenuItem", "AuditLog", "ClosedDate", "User", "Settings" RESTART IDENTITY CASCADE',
  );
  await seed(prisma);
  // Every day open, so "tomorrow" is always orderable whatever the real weekday is.
  await prisma.settings.update({ where: { id: 1 }, data: { closedWeekdays: [] } });
  const tomorrow = addDays(todayIST(), 1);
  const curry = await prisma.menuItem.findFirstOrThrow({ where: { name: 'Chicken Curry' } });
  await prisma.dailyMenuItem.update({
    where: { menuDate_menuItemId: { menuDate: dbDate(tomorrow), menuItemId: curry.id } },
    data: { quantity: 30, orderedQty: 25 },
  });
  // Sprint 2+ fixtures on tomorrow's menu: sold out, scarce, and an HTML-looking name (TC-UI-07, TC-UI-11)
  const byName = async (name: string) => prisma.menuItem.findFirstOrThrow({ where: { name } });
  const paneer = await byName('Paneer Butter Masala');
  await prisma.dailyMenuItem.update({
    where: { menuDate_menuItemId: { menuDate: dbDate(tomorrow), menuItemId: paneer.id } },
    data: { quantity: 40, orderedQty: 40 },
  });
  const dal = await byName('Dal Tadka + Rice');
  await prisma.dailyMenuItem.update({
    where: { menuDate_menuItemId: { menuDate: dbDate(tomorrow), menuItemId: dal.id } },
    data: { quantity: 60, orderedQty: 57 },
  });
  const xss = await prisma.menuItem.create({
    data: { name: '<img src=x onerror=alert(1)>', description: '<script>alert(2)</script>', category: 'SIDE', diet: 'VEG', pricePaise: 1000 },
  });
  await prisma.dailyMenuItem.create({ data: { menuDate: dbDate(tomorrow), menuItemId: xss.id, quantity: 20 } });
  console.log(`E2E database seeded (tomorrow = ${tomorrow})`);
}
main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
