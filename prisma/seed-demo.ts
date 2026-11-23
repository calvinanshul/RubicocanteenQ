/**
 * Demo data matching the design mockups (UI spec §8, BE-16): `npm run db:seed:demo`.
 * Replaces all orders on TODAY and on the PREVIOUS WORKING DAY (IST) in the target database.
 * Refuses to run when APP_ENV=production.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PrismaClient, type OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, combineIST, dbDate, todayIST, weekdayOf } from '@/server/adapters/clock';
import { SEED_DISHES, seed } from './seedData';

const rootEnv = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const SLOTS = ['12:30', '12:45', '13:00', '13:15', '13:30', '13:45', '14:00', '14:15'];
const SLOT_COUNTS = [14, 19, 24, 21, 16, 12, 8, 6]; // 120 orders, busiest 13:00 (24)
/**
 * Portions ordered today per dish by the 119 demo employees. With Priya's 1 Veg Biryani this gives the design's
 * totals: VB 68/80, CC 30/30 sold out, PBM 40/40 sold out, DT 19/60, CR 22/40, MC 48/100 (227 portions).
 */
const PORTIONS: Record<string, number> = {
  'Veg Biryani': 67, 'Chicken Curry': 30, 'Paneer Butter Masala': 40, 'Dal Tadka + Rice': 19, 'Curd Rice': 22, 'Masala Chaas': 48,
};
const FIRST = ['Aarav', 'Diya', 'Rohan', 'Meera', 'Kabir', 'Ananya', 'Vikram', 'Sneha', 'Arjun', 'Isha', 'Neel', 'Tara', 'Dev', 'Kavya', 'Rahul', 'Pooja'];
const LAST = ['Rao', 'Nair', 'Gupta', 'Iyer', 'Shah', 'Menon', 'Das', 'Kulkarni', 'Bose', 'Reddy'];
const DEPTS = ['Tech Eng', 'Finance', 'HR', 'Sales', 'Design', 'Ops', 'QA', 'Support'];
const CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Small deterministic PRNG so every run produces the same demo. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const prisma = new PrismaClient();

async function main() {
  if (process.env.APP_ENV === 'production') throw new Error('db:seed:demo refuses to run with APP_ENV=production');
  await seed(prisma);
  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
  const today = todayIST();
  let prev = addDays(today, -1);
  while (settings.closedWeekdays.includes(weekdayOf(prev))) prev = addDays(prev, -1);
  const rand = rng(17112026);

  // Dishes and daily menus for both dates, with the design's limits
  const dishes = await Promise.all(SEED_DISHES.map((d) => prisma.menuItem.findFirstOrThrow({ where: { name: d.name, isActive: true } })));
  const limits = Object.fromEntries(SEED_DISHES.map((d) => [d.name, d.quantity]));
  // Old demo orders on these dates go first (items cascade), then stock is recomputed below
  await prisma.order.deleteMany({ where: { orderDate: { in: [dbDate(today), dbDate(prev)] } } });
  const menu: Record<string, Record<string, number>> = {};
  for (const date of [today, prev]) {
    menu[date] = {};
    for (const d of dishes) {
      const row = await prisma.dailyMenuItem.upsert({
        where: { menuDate_menuItemId: { menuDate: dbDate(date), menuItemId: d.id } },
        update: { quantity: date === today ? (limits[d.name] ?? 50) : 200, orderedQty: 0 },
        create: { menuDate: dbDate(date), menuItemId: d.id, quantity: date === today ? (limits[d.name] ?? 50) : 200 },
      });
      (menu[date] as Record<string, number>)[d.name] = row.id;
    }
  }

  // 119 demo employees + Priya
  const hash = await bcrypt.hash('Demo@2026', 12);
  const people = [];
  for (let i = 1; i <= 119; i++) {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
    const email = `demo${String(i).padStart(3, '0')}@rubicotech.com`;
    people.push(
      await prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, name, passwordHash: hash, role: 'EMPLOYEE', employeeCode: `EMP-${7000 + i}`, department: DEPTS[i % DEPTS.length] ?? null },
      }),
    );
  }
  const priya = await prisma.user.findFirstOrThrow({ where: { employeeCode: 'EMP-8921' } });
  const staff = await prisma.user.findFirstOrThrow({ where: { role: 'STAFF' } });

  // Today's statuses: 90 collected, 6 placed, 4 preparing, 10 ready (incl. Priya), 6 cancelled, 4 no-show
  const statuses: OrderStatus[] = [
    ...Array<OrderStatus>(90).fill('COLLECTED'), ...Array<OrderStatus>(6).fill('PLACED'), ...Array<OrderStatus>(4).fill('PREPARING'),
    ...Array<OrderStatus>(9).fill('READY'), ...Array<OrderStatus>(6).fill('CANCELLED'), ...Array<OrderStatus>(4).fill('NO_SHOW'),
  ];
  for (let i = statuses.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [statuses[i], statuses[j]] = [statuses[j] as OrderStatus, statuses[i] as OrderStatus];
  }
  const slotOf: string[] = SLOTS.flatMap((s, i) => Array<string>((SLOT_COUNTS[i] ?? 0) - (s === '13:00' ? 1 : 0)).fill(s));

  // Spread the portions over the active (non-cancelled) orders
  const activeIdx = statuses.map((s, i) => (s === 'CANCELLED' ? -1 : i)).filter((i) => i >= 0);
  const lines: Record<string, number>[] = statuses.map(() => ({}));
  const bag = Object.entries(PORTIONS).flatMap(([name, n]) => Array<string>(n).fill(name));
  bag.forEach((name, k) => {
    const order = lines[activeIdx[k % activeIdx.length] as number] as Record<string, number>;
    order[name] = (order[name] ?? 0) + 1;
  });
  const price = Object.fromEntries(dishes.map((d) => [d.name, d.pricePaise]));
  const usedCodes = new Set(['K7Q4MZ']);
  const code = () => {
    let c = '';
    do c = Array.from({ length: 6 }, () => CODE[Math.floor(rand() * CODE.length)]).join('');
    while (usedCodes.has(c));
    usedCodes.add(c);
    return c;
  };

  async function createOrder(userId: number, date: string, slot: string, status: OrderStatus, items: Record<string, number>, pickupCode: string, placedAt: string) {
    const entries = Object.entries(items).filter(([, q]) => q > 0);
    const slotStart = combineIST(date, slot);
    await prisma.order.create({
      data: {
        userId, orderDate: dbDate(date), slotStart: slot, status, pickupCode,
        totalPaise: entries.reduce((s, [n, q]) => s + q * (price[n] ?? 0), 0),
        createdAt: combineIST(date, placedAt),
        cancelledAt: status === 'CANCELLED' ? combineIST(date, '10:40') : null,
        readyAt: ['READY', 'COLLECTED', 'NO_SHOW'].includes(status) ? new Date(slotStart.getTime() - 5 * 60_000) : null,
        collectedAt: status === 'COLLECTED' ? new Date(slotStart.getTime() + Math.floor(rand() * 12) * 60_000) : null,
        collectedById: status === 'COLLECTED' ? staff.id : null,
        items: { create: entries.map(([n, q]) => ({ dailyMenuItemId: menu[date]?.[n] as number, itemNameSnapshot: n, unitPricePaiseSnapshot: price[n] ?? 0, qty: q })) },
      },
    });
  }
  const placedTime = () => `${String(8 + Math.floor(rand() * 3)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`;

  // Priya: order #K7Q4MZ, 1 × Veg Biryani, 13:00, READY, placed 10:18 (design S5)
  await createOrder(priya.id, today, '13:00', 'READY', { 'Veg Biryani': 1 }, 'K7Q4MZ', '10:18');
  for (let i = 0; i < 119; i++) {
    const items = statuses[i] === 'CANCELLED' ? { 'Veg Biryani': 1 } : lines[i] ?? {};
    if (statuses[i] !== 'CANCELLED' && Object.keys(items).length === 0) items['Masala Chaas'] = 1;
    await createOrder(people[i]!.id, today, slotOf[i] as string, statuses[i] as OrderStatus, items, code(), placedTime());
  }
  // Previous working day: 105 orders (so today shows about +14% vs yesterday)
  for (let i = 0; i < 105; i++) {
    const who = i === 0 ? priya.id : people[i]!.id;
    await createOrder(who, prev, SLOTS[i % SLOTS.length] as string, 'COLLECTED', { [SEED_DISHES[i % SEED_DISHES.length]!.name]: 1 }, code(), placedTime());
  }

  // Recompute stock counters from the orders (cancelled excluded)
  for (const date of [today, prev]) {
    for (const id of Object.values(menu[date] ?? {})) {
      const sum = await prisma.orderItem.aggregate({ _sum: { qty: true }, where: { dailyMenuItemId: id, order: { status: { not: 'CANCELLED' } } } });
      await prisma.dailyMenuItem.update({ where: { id }, data: { orderedQty: sum._sum.qty ?? 0 } });
    }
  }
  const n = await prisma.order.count({ where: { orderDate: dbDate(today) } });
  console.log(`Demo seed complete: ${n} orders today (${today}), 105 on ${prev}. Priya's pass: K7Q4MZ (READY, 13:00).`);
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
