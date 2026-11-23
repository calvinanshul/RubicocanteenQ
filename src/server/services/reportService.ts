import type { DashboardDto, PrepItemDto } from '@/shared';
import { addDays, dbDate, fromDbDate } from '../adapters/clock';
import { prisma } from '../db';
import { generateSlots, isClosedDay } from './rules';
import { getSettings } from './settingsService';

const round1 = (n: number) => Math.round(n * 10) / 10;

/** R2: portions to cook per dish for a date; cancelled orders are already excluded from orderedQty (US-12 AC6). */
export async function prepList(date: string): Promise<PrepItemDto[]> {
  const rows = await prisma.dailyMenuItem.findMany({ where: { menuDate: dbDate(date) }, include: { menuItem: true }, orderBy: { id: 'asc' } });
  return rows.map((r) => ({
    name: r.menuItem.name,
    diet: r.menuItem.diet,
    category: r.menuItem.category,
    qty: r.orderedQty,
    quantity: r.quantity,
    soldOut: r.orderedQty >= r.quantity,
  }));
}

/** The previous working day (skips closed weekdays and closed dates), up to two weeks back. */
async function previousWorkingDay(date: string, closedWeekdays: number[]): Promise<string | null> {
  const from = addDays(date, -14);
  const closed = (await prisma.closedDate.findMany({ where: { date: { gte: dbDate(from), lt: dbDate(date) } } })).map((c) => fromDbDate(c.date));
  for (let d = addDays(date, -1); d >= from; d = addDays(d, -1)) {
    if (!isClosedDay(d, { closedWeekdays }, closed)) return d;
  }
  return null;
}

/**
 * R1 (US-14, D14, D15). Counting rules:
 * orders = all orders incl. cancelled · revenue = every order except cancelled · pending = PLACED + PREPARING + READY
 * avg = revenue / orders · items and slot counts exclude cancelled · vsYesterday vs the previous working day (null if it had none).
 */
export async function dashboard(date: string, nowInstant: Date): Promise<DashboardDto> {
  const settings = await getSettings();
  const [orders, menu] = await Promise.all([
    prisma.order.findMany({ where: { orderDate: dbDate(date) }, select: { status: true, totalPaise: true, slotStart: true } }),
    prisma.dailyMenuItem.findMany({ where: { menuDate: dbDate(date) }, include: { menuItem: true }, orderBy: { id: 'asc' } }),
  ]);
  const count = (s: string) => orders.filter((o) => o.status === s).length;
  const active = orders.filter((o) => o.status !== 'CANCELLED');
  const revenuePaise = active.reduce((sum, o) => sum + o.totalPaise, 0);
  const total = orders.length;
  const collected = count('COLLECTED');

  const prev = await previousWorkingDay(date, settings.closedWeekdays);
  const prevCount = prev ? await prisma.order.count({ where: { orderDate: dbDate(prev) } }) : 0;

  const perSlot = new Map<string, number>();
  for (const o of active) perSlot.set(o.slotStart, (perSlot.get(o.slotStart) ?? 0) + 1);
  const slots = generateSlots(settings).map((s) => ({ start: s.start, count: perSlot.get(s.start) ?? 0 }));
  for (const [start, c] of perSlot) if (!slots.some((s) => s.start === start)) slots.push({ start, count: c });
  slots.sort((a, b) => a.start.localeCompare(b.start));
  const peak = slots.reduce<{ start: string; count: number } | null>((best, s) => (s.count > 0 && (!best || s.count > best.count) ? s : best), null);

  return {
    date,
    kpis: {
      orders: total,
      revenuePaise,
      avgOrderPaise: total ? Math.round(revenuePaise / total) : 0,
      collected,
      collectedPct: total ? round1((collected / total) * 100) : 0,
      pending: count('PLACED') + count('PREPARING') + count('READY'),
      cancelled: count('CANCELLED'),
      noShow: count('NO_SHOW'),
      vsYesterdayPct: prevCount ? round1(((total - prevCount) / prevCount) * 100) : null,
    },
    items: menu.map((r) => ({
      name: r.menuItem.name,
      diet: r.menuItem.diet,
      ordered: r.orderedQty,
      quantity: r.quantity,
      remaining: r.quantity - r.orderedQty,
      soldOut: r.orderedQty >= r.quantity,
    })),
    slots,
    capacityPerSlot: settings.slotCapacity,
    peakSlot: peak?.start ?? null,
    lastUpdated: nowInstant.toISOString(),
  };
}
