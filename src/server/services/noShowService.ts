import { addDays, combineIST, dbDate, fromDbDate, todayIST } from '../adapters/clock';
import { prisma } from '../db';
import { slotEndOf } from './rules';
import { getSettings } from './settingsService';

/**
 * ST-17 / US-20: orders still PLACED, PREPARING or READY after their slot ended plus the grace
 * period become NO_SHOW (and stay billed, BR10). Looks back 7 days so a missed run catches up.
 */
export async function markNoShows(nowInstant: Date): Promise<number> {
  const settings = await getSettings();
  const today = todayIST(nowInstant);
  const candidates = await prisma.order.findMany({
    where: { orderDate: { gte: dbDate(addDays(today, -7)), lte: dbDate(today) }, status: { in: ['PLACED', 'PREPARING', 'READY'] } },
    select: { id: true, orderDate: true, slotStart: true, status: true },
  });
  const graceMs = settings.noShowGraceMinutes * 60_000;
  const overdue = candidates.filter(
    (o) => combineIST(fromDbDate(o.orderDate), slotEndOf(o.slotStart, settings.slotMinutes)).getTime() + graceMs < nowInstant.getTime(),
  );
  let updated = 0;
  for (const o of overdue) {
    // Conditional update: an order handed over meanwhile stays COLLECTED
    const res = await prisma.order.updateMany({ where: { id: o.id, status: o.status }, data: { status: 'NO_SHOW' } });
    updated += res.count;
  }
  return updated;
}
