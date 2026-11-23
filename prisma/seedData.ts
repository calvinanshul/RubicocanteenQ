import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, dbDate, todayIST } from '@/server/adapters/clock';

/** Demo/test credentials only (05-data-model.md §5). Change them in production. */
export const SEED_USERS = [
  { email: 'admin@rubicotech.com', password: 'Admin@2026', name: 'Anil Mehta', role: 'ADMIN', employeeCode: 'EMP-1001', department: 'Facilities' },
  { email: 'manager@rubicotech.com', password: 'Manager@2026', name: 'Ramesh Iyer', role: 'MANAGER', employeeCode: 'EMP-2001', department: 'Canteen' },
  { email: 'staff@rubicotech.com', password: 'Staff@2026', name: 'Sunita Devi', role: 'STAFF', employeeCode: 'EMP-3001', department: 'Canteen' },
  { email: 'priya@rubicotech.com', password: 'Employee@2026', name: 'Priya Sharma', role: 'EMPLOYEE', employeeCode: 'EMP-8921', department: 'Tech Eng' },
] as const;

/** The 6 dishes from the design (UI spec §8): price, daily limit. */
export const SEED_DISHES = [
  { name: 'Veg Biryani', description: 'Fragrant basmati rice layered with vegetables and whole spices, served with raita.', category: 'MAIN', diet: 'VEG', pricePaise: 12000, quantity: 80 },
  { name: 'Chicken Curry', description: 'Home-style chicken curry with steamed rice.', category: 'MAIN', diet: 'NON_VEG', pricePaise: 15000, quantity: 30 },
  { name: 'Paneer Butter Masala', description: 'Paneer in a rich tomato-butter gravy with two rotis.', category: 'MAIN', diet: 'VEG', pricePaise: 13000, quantity: 40 },
  { name: 'Dal Tadka + Rice', description: 'Yellow dal tempered with cumin and garlic, with jeera rice.', category: 'COMBO', diet: 'VEG', pricePaise: 8000, quantity: 60 },
  { name: 'Curd Rice', description: 'Cool curd rice with a mustard-curry-leaf tempering.', category: 'LIGHT', diet: 'VEG', pricePaise: 6000, quantity: 40 },
  { name: 'Masala Chaas', description: 'Spiced buttermilk with roasted cumin and mint.', category: 'BEVERAGE', diet: 'VEG', pricePaise: 2500, quantity: 100 },
] as const;

/** Idempotent base seed: settings, 4 role users, 6 dishes, today's and tomorrow's menu. */
export async function seed(prisma: PrismaClient, now: Date = new Date()): Promise<void> {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, pickupLocation: 'Building 4 · Counter A' },
  });

  for (const u of SEED_USERS) {
    const exists = await prisma.user.findUnique({ where: { email: u.email } });
    if (!exists) {
      await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          role: u.role,
          employeeCode: u.employeeCode,
          department: u.department,
          passwordHash: await bcrypt.hash(u.password, 12),
        },
      });
    }
  }

  const today = todayIST(now);
  for (const d of SEED_DISHES) {
    const { quantity, ...dish } = d;
    let item = await prisma.menuItem.findFirst({ where: { name: dish.name, isActive: true } });
    item ??= await prisma.menuItem.create({ data: dish });
    for (const date of [today, addDays(today, 1)]) {
      await prisma.dailyMenuItem.upsert({
        where: { menuDate_menuItemId: { menuDate: dbDate(date), menuItemId: item.id } },
        update: {},
        create: { menuDate: dbDate(date), menuItemId: item.id, quantity },
      });
    }
  }
}
