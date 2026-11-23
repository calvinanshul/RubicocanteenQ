import type { DailyMenuDto, DailyMenuPutInput } from '@/shared';
import { dbDate, fromDbDate } from '../adapters/clock';
import { prisma } from '../db';
import { AppError } from '../errors';
import { isClosedDay, isOrderingOpen, isPastDate } from './rules';
import { getSettings } from './settingsService';

async function closedDatesFor(date: string): Promise<string[]> {
  const rows = await prisma.closedDate.findMany({ where: { date: dbDate(date) } });
  return rows.map((r) => fromDbDate(r.date));
}

async function load(date: string, nowInstant: Date): Promise<DailyMenuDto | null> {
  const settings = await getSettings();
  const closed = isClosedDay(date, settings, await closedDatesFor(date));
  const rows = await prisma.dailyMenuItem.findMany({
    where: { menuDate: dbDate(date) },
    include: { menuItem: true },
    orderBy: { id: 'asc' },
  });
  const base = {
    date,
    serverTime: nowInstant.toISOString(),
    orderingOpen: !closed && isOrderingOpen(date, nowInstant, settings),
    cutoff: settings.orderCutoff,
    closed,
    pickupLocation: settings.pickupLocation,
  };
  // A closed day is never orderable (orderingOpen is false), but any saved rows are still
  // returned so the manager can see and correct them (BUG-01-001).
  if (rows.length === 0) return closed ? { ...base, items: [] } : null;
  return {
    ...base,
    items: rows.map((r) => ({
      dailyMenuItemId: r.id,
      menuItemId: r.menuItemId,
      name: r.menuItem.name,
      description: r.menuItem.description,
      pricePaise: r.menuItem.pricePaise,
      diet: r.menuItem.diet,
      category: r.menuItem.category,
      quantity: r.quantity,
      ordered: r.orderedQty,
      remaining: r.quantity - r.orderedQty,
    })),
  };
}

/** M4: the menu for a date. 422 MENU_NOT_PUBLISHED when nothing is set (US-08 AC4). */
export async function getDailyMenu(date: string, nowInstant: Date): Promise<DailyMenuDto> {
  const menu = await load(date, nowInstant);
  if (!menu) throw new AppError('MENU_NOT_PUBLISHED', 422, "This day's menu isn't published yet. Check back soon.");
  return menu;
}

/** M5: replace the menu for a date (US-07). */
export async function putDailyMenu(date: string, input: DailyMenuPutInput, nowInstant: Date): Promise<DailyMenuDto> {
  if (isPastDate(date, nowInstant)) {
    throw new AppError('VALIDATION_ERROR', 400, 'Cannot change menu for a past date', {
      date: 'Cannot change menu for a past date',
    });
  }
  await prisma.$transaction(async (tx) => {
    const ids = input.entries.map((e) => e.menuItemId);
    const items = await tx.menuItem.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true } });
    const known = new Set(items.map((i) => i.id));
    const unknownFields: Record<string, string> = {};
    input.entries.forEach((e, i) => {
      if (!known.has(e.menuItemId)) unknownFields[`entries.${i}.menuItemId`] = 'Dish not found or archived';
    });
    if (Object.keys(unknownFields).length) {
      throw new AppError('VALIDATION_ERROR', 400, 'Please fix the highlighted fields', unknownFields);
    }

    // Lock existing rows for this date so the "already ordered" check can't race with new orders
    const existing = await tx.$queryRaw<{ id: number; menuItemId: number; orderedQty: number }[]>`
      SELECT id, "menuItemId", "orderedQty" FROM "DailyMenuItem"
      WHERE "menuDate" = ${date}::date FOR UPDATE`;
    const existingByItem = new Map(existing.map((r) => [r.menuItemId, r]));

    const fields: Record<string, string> = {};
    let firstMessage = '';
    input.entries.forEach((e, i) => {
      const row = existingByItem.get(e.menuItemId);
      if (row && e.quantity < row.orderedQty) {
        const msg = `Quantity can't be lower than already ordered (${row.orderedQty})`;
        fields[`entries.${i}.quantity`] = msg;
        firstMessage ||= msg;
      }
    });
    if (Object.keys(fields).length) throw new AppError('QTY_BELOW_ORDERED', 409, firstMessage, fields);

    const keep = new Set(ids);
    const removed = existing.filter((r) => !keep.has(r.menuItemId));
    if (removed.length) {
      const withOrders = await tx.orderItem.findMany({
        where: { dailyMenuItemId: { in: removed.map((r) => r.id) } },
        select: { dailyMenuItemId: true },
        distinct: ['dailyMenuItemId'],
      });
      if (withOrders.length) {
        throw new AppError(
          'QTY_BELOW_ORDERED',
          409,
          "A dish that already has orders can't be removed from the menu",
        );
      }
      await tx.dailyMenuItem.deleteMany({ where: { id: { in: removed.map((r) => r.id) } } });
    }

    for (const e of input.entries) {
      await tx.dailyMenuItem.upsert({
        where: { menuDate_menuItemId: { menuDate: dbDate(date), menuItemId: e.menuItemId } },
        update: { quantity: e.quantity },
        create: { menuDate: dbDate(date), menuItemId: e.menuItemId, quantity: e.quantity },
      });
    }
  });
  return getDailyMenu(date, nowInstant);
}
