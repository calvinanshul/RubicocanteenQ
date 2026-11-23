import { addDays, dbDate, fromDbDate } from '../adapters/clock';
import { toCSV } from '../adapters/csv';
import { prisma } from '../db';
import { slotEndOf } from './rules';
import { getSettings } from './settingsService';

export const ORDER_COLUMNS = ['date', 'order_id', 'pickup_code', 'employee_name', 'employee_email', 'items', 'total_inr', 'status', 'slot'];
export const STATEMENT_COLUMNS = ['employee', 'employee_code', 'department', 'email', 'orders', 'total_inr'];

/** 24000 paise → "240.00" (plain number, no ₹ sign or grouping, so spreadsheets can sum it). */
export function inr(paise: number): string {
  return (paise / 100).toFixed(2);
}

/** R3: every order in the inclusive range, oldest first (US-17 AC1). */
export async function ordersCsv(from: string, to: string): Promise<string> {
  const settings = await getSettings();
  const orders = await prisma.order.findMany({
    where: { orderDate: { gte: dbDate(from), lte: dbDate(to) } },
    include: { user: { select: { name: true, email: true } }, items: { orderBy: { id: 'asc' } } },
    orderBy: [{ orderDate: 'asc' }, { slotStart: 'asc' }, { id: 'asc' }],
  });
  const rows = orders.map((o) => ({
    date: fromDbDate(o.orderDate),
    order_id: o.id,
    pickup_code: o.pickupCode,
    employee_name: o.user.name,
    employee_email: o.user.email,
    items: o.items.map((i) => `${i.qty} x ${i.itemNameSnapshot}`).join('; '),
    total_inr: inr(o.totalPaise),
    status: o.status,
    slot: `${o.slotStart}-${slotEndOf(o.slotStart, settings.slotMinutes)}`,
  }));
  return toCSV(rows, ORDER_COLUMNS);
}

/**
 * R4: one row per employee with billable orders in the month. Every order except CANCELLED is
 * billed, so no-shows are charged (BR10).
 */
export async function statementCsv(month: string): Promise<string> {
  const from = `${month}-01`;
  const next = addDays(from, 32).slice(0, 7); // the following month
  const grouped = await prisma.order.groupBy({
    by: ['userId'],
    where: { orderDate: { gte: dbDate(from), lt: dbDate(`${next}-01`) }, status: { not: 'CANCELLED' } },
    _count: { _all: true },
    _sum: { totalPaise: true },
  });
  const users = await prisma.user.findMany({ where: { id: { in: grouped.map((g) => g.userId) } } });
  const byId = new Map(users.map((u) => [u.id, u]));
  const rows = grouped
    .map((g) => {
      const u = byId.get(g.userId);
      return {
        employee: u?.name ?? '',
        employee_code: u?.employeeCode ?? '',
        department: u?.department ?? '',
        email: u?.email ?? '',
        orders: g._count._all,
        total_inr: inr(g._sum.totalPaise ?? 0),
      };
    })
    .sort((a, b) => a.employee.localeCompare(b.employee) || a.email.localeCompare(b.email));
  return toCSV(rows, STATEMENT_COLUMNS);
}
