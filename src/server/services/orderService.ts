import { Prisma, type Order, type OrderItem, type Settings } from '@prisma/client';
import type { MyOrdersPage, MyOrdersSummary, OrderDto, OrderInput, SlotDto } from '@/shared';
import { addDays, dbDate, fromDbDate, todayIST } from '../adapters/clock';
import { prisma } from '../db';
import { AppError } from '../errors';
import { generatePickupCode } from './pickupCode';
import { generateSlots, isClosedDay, isOrderingOpen, isValidOrderDate, isValidSlot, slotEndOf } from './rules';
import { getSettings } from './settingsService';

type OrderWithItems = Order & { items: OrderItem[] };

function dayWord(date: string, nowInstant: Date): string {
  return date === todayIST(nowInstant) ? 'today' : date;
}

export function toOrderDto(o: OrderWithItems, settings: Settings, nowInstant: Date): OrderDto {
  const date = fromDbDate(o.orderDate);
  return {
    id: o.id,
    status: o.status,
    date,
    slotStart: o.slotStart,
    slotEnd: slotEndOf(o.slotStart, settings.slotMinutes),
    pickupLocation: settings.pickupLocation,
    createdAt: o.createdAt.toISOString(),
    pickupCode: o.pickupCode,
    totalPaise: o.totalPaise,
    items: o.items
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((i) => ({ name: i.itemNameSnapshot, qty: i.qty, unitPricePaise: i.unitPricePaiseSnapshot })),
    cancellable: o.status === 'PLACED' && isOrderingOpen(date, nowInstant, settings),
    cutoff: settings.orderCutoff,
    readyAt: o.readyAt?.toISOString() ?? null,
    collectedAt: o.collectedAt?.toISOString() ?? null,
    cancelledAt: o.cancelledAt?.toISOString() ?? null,
    serverTime: nowInstant.toISOString(),
  };
}

/** Idempotency keys are scoped per user, so one user's key can never return another user's order. */
function scopedKey(userId: number, key: string | undefined): string | null {
  return key ? `${userId}:${key.slice(0, 100)}` : null;
}

async function closedDates(date: string): Promise<string[]> {
  const rows = await prisma.closedDate.findMany({ where: { date: dbDate(date) } });
  return rows.map((r) => fromDbDate(r.date));
}

function isUniqueViolation(err: unknown, target: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false;
  const meta = err.meta?.target;
  const text = Array.isArray(meta) ? meta.join(',') : String(meta ?? '');
  return text.includes(target);
}

/**
 * O1: place an order (US-09). Checks run cheapest-first; stock and slot capacity are enforced inside one
 * transaction with a conditional UPDATE per item (never read-then-write), so concurrent orders can't oversell (BR2).
 */
export async function placeOrder(
  userId: number,
  input: OrderInput,
  idempotencyKey: string | undefined,
  nowInstant: Date,
): Promise<{ order: OrderDto; created: boolean }> {
  const settings = await getSettings();
  const key = scopedKey(userId, idempotencyKey);

  // US-09 AC9: a repeated key returns the original order, even after the cut-off
  if (key) {
    const existing = await prisma.order.findUnique({ where: { idempotencyKey: key }, include: { items: true } });
    if (existing) return { order: toOrderDto(existing, settings, nowInstant), created: false };
  }

  const { date, slotStart, items } = input;
  if (!isValidOrderDate(date, nowInstant)) {
    throw new AppError('VALIDATION_ERROR', 400, 'You can order for today or tomorrow only', {
      date: 'You can order for today or tomorrow only',
    });
  }
  if (isClosedDay(date, settings, await closedDates(date))) {
    throw new AppError('CANTEEN_CLOSED', 422, 'The canteen is closed on this day');
  }
  const menuRows = await prisma.dailyMenuItem.findMany({ where: { menuDate: dbDate(date) }, include: { menuItem: true } });
  if (menuRows.length === 0) {
    throw new AppError('MENU_NOT_PUBLISHED', 422, "This day's menu isn't published yet");
  }
  if (!isOrderingOpen(date, nowInstant, settings)) {
    throw new AppError('CUTOFF_PASSED', 409, `Ordering for ${dayWord(date, nowInstant)} closed at ${settings.orderCutoff}`);
  }
  if (!isValidSlot(slotStart, settings)) {
    throw new AppError('VALIDATION_ERROR', 400, 'Choose a valid pickup slot', { slotStart: 'Choose a valid pickup slot' });
  }
  const byId = new Map(menuRows.map((r) => [r.id, r]));
  const notOnMenu: Record<string, string> = {};
  items.forEach((it, i) => {
    if (!byId.has(it.dailyMenuItemId)) notOnMenu[`items.${i}.dailyMenuItemId`] = 'Item not on the menu for this date';
  });
  if (Object.keys(notOnMenu).length) {
    throw new AppError('VALIDATION_ERROR', 400, 'Item not on the menu for this date', notOnMenu);
  }
  const active = await prisma.order.findFirst({ where: { userId, orderDate: dbDate(date), status: { not: 'CANCELLED' } } });
  if (active) throw orderExists();

  const totalPaise = items.reduce((sum, it) => sum + it.qty * (byId.get(it.dailyMenuItemId)?.menuItem.pricePaise ?? 0), 0);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const order = await prisma.$transaction(async (tx) => {
        // US-19: serialise bookings per slot, then check capacity
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`slot:${date}:${slotStart}`}))`;
        const booked = await tx.order.count({ where: { orderDate: dbDate(date), slotStart, status: { not: 'CANCELLED' } } });
        if (booked >= settings.slotCapacity) {
          throw new AppError('SLOT_FULL', 409, 'This slot just filled up. Pick another.', { slotStart: 'This slot is full' });
        }
        // BR2: atomic conditional decrement per item; 0 rows updated → not enough left
        for (const it of items) {
          const row = byId.get(it.dailyMenuItemId);
          const updated = await tx.$executeRaw`
            UPDATE "DailyMenuItem" SET "orderedQty" = "orderedQty" + ${it.qty}
            WHERE id = ${it.dailyMenuItemId} AND "orderedQty" + ${it.qty} <= quantity`;
          if (updated === 0) {
            const fresh = await tx.dailyMenuItem.findUnique({ where: { id: it.dailyMenuItemId } });
            const left = fresh ? fresh.quantity - fresh.orderedQty : 0;
            const name = row?.menuItem.name ?? 'this item';
            throw new AppError('OUT_OF_STOCK', 409, left > 0 ? `Only ${left} ${name} left` : `${name} is sold out`, {
              [`items.${items.indexOf(it)}.qty`]: left > 0 ? `Only ${left} left` : 'Sold out',
            });
          }
        }
        return tx.order.create({
          data: {
            userId,
            orderDate: dbDate(date),
            slotStart,
            totalPaise,
            pickupCode: generatePickupCode(),
            idempotencyKey: key,
            items: {
              create: items.map((it) => {
                const row = byId.get(it.dailyMenuItemId);
                return {
                  dailyMenuItemId: it.dailyMenuItemId,
                  itemNameSnapshot: row?.menuItem.name ?? '',
                  unitPricePaiseSnapshot: row?.menuItem.pricePaise ?? 0,
                  qty: it.qty,
                };
              }),
            },
          },
          include: { items: true },
        });
      });
      return { order: toOrderDto(order, settings, nowInstant), created: true };
    } catch (err) {
      if (isUniqueViolation(err, 'pickupCode')) continue; // vanishingly rare clash: new code, retry
      if (key && isUniqueViolation(err, 'idempotencyKey')) {
        const winner = await prisma.order.findUnique({ where: { idempotencyKey: key }, include: { items: true } });
        if (winner) return { order: toOrderDto(winner, settings, nowInstant), created: false };
      }
      // BR4 partial unique index (one active order per user per day) as the last line of defence
      if (isUniqueViolation(err, 'userId') || isUniqueViolation(err, 'order_one_active_per_day')) throw orderExists();
      throw err;
    }
  }
  throw new AppError('INTERNAL_ERROR', 500, 'Could not create the order. Please try again.');
}

function orderExists(): AppError {
  return new AppError(
    'ORDER_EXISTS_FOR_DATE',
    409,
    'You already have an order for this day. Cancel it to order again.',
  );
}

/** O3 / O4 lookup: employees only see their own orders (404 otherwise, so existence isn't revealed). */
export async function getOrderFor(
  orderId: number,
  viewer: { id: number; role: string },
): Promise<OrderWithItems> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  const allowed = order && (viewer.role === 'STAFF' || order.userId === viewer.id);
  if (!order || !allowed) throw new AppError('NOT_FOUND', 404, 'Order not found');
  return order;
}

export async function getOrderDto(orderId: number, viewer: { id: number; role: string }, nowInstant: Date): Promise<OrderDto> {
  const [order, settings] = await Promise.all([getOrderFor(orderId, viewer), getSettings()]);
  return toOrderDto(order, settings, nowInstant);
}

/** O5: owner cancels a PLACED order before the cut-off; stock goes back in the same transaction (US-10). */
export async function cancelOrder(orderId: number, userId: number, nowInstant: Date): Promise<OrderDto> {
  const settings = await getSettings();
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.userId !== userId) throw new AppError('NOT_FOUND', 404, 'Order not found');
  if (order.status !== 'PLACED') {
    throw new AppError('INVALID_STATUS', 409, `This order is ${order.status.toLowerCase().replace('_', '-')} and can't be cancelled`);
  }
  const date = fromDbDate(order.orderDate);
  if (!isOrderingOpen(date, nowInstant, settings)) {
    throw new AppError('CUTOFF_PASSED', 409, `Orders can't be cancelled after ${settings.orderCutoff}`);
  }
  const updated = await prisma.$transaction(async (tx) => {
    // Conditional status change: a concurrent second cancel updates 0 rows and restores nothing
    const changed = await tx.order.updateMany({
      where: { id: orderId, status: 'PLACED' },
      data: { status: 'CANCELLED', cancelledAt: nowInstant },
    });
    if (changed.count === 0) throw new AppError('INVALID_STATUS', 409, "This order can't be cancelled");
    for (const it of order.items) {
      await tx.dailyMenuItem.update({ where: { id: it.dailyMenuItemId }, data: { orderedQty: { decrement: it.qty } } });
    }
    return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  });
  return toOrderDto(updated, settings, nowInstant);
}

/** O2: the employee's own orders, newest first (optionally one date). */
export async function listMyOrders(
  userId: number,
  opts: { page: number; date?: string },
  nowInstant: Date,
): Promise<MyOrdersPage> {
  const pageSize = 10;
  const where: Prisma.OrderWhereInput = { userId, ...(opts.date ? { orderDate: dbDate(opts.date) } : {}) };
  const [settings, total, rows] = await Promise.all([
    getSettings(),
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: [{ orderDate: 'desc' }, { createdAt: 'desc' }],
      skip: (opts.page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    items: rows.map((o) => toOrderDto(o, settings, nowInstant)),
    page: opts.page,
    pageSize,
    total,
    summary: await monthSummary(userId, todayIST(nowInstant).slice(0, 7)),
  };
}

/** S6 "Orders in Nov: 12 · On statement: ₹1,340": this month's billed orders (all but CANCELLED, BR10). */
async function monthSummary(userId: number, month: string): Promise<MyOrdersSummary> {
  const from = `${month}-01`;
  const next = `${addDays(from, 32).slice(0, 7)}-01`;
  const agg = await prisma.order.aggregate({
    where: { userId, orderDate: { gte: dbDate(from), lt: dbDate(next) }, status: { not: 'CANCELLED' } },
    _count: { _all: true },
    _sum: { totalPaise: true },
  });
  return { month, orders: agg._count._all, totalPaise: agg._sum.totalPaise ?? 0 };
}

/** M6: slots for a date with bookings (active orders) and capacity (US-19). */
export async function listSlots(date: string): Promise<SlotDto[]> {
  const settings = await getSettings();
  const counts = await prisma.order.groupBy({
    by: ['slotStart'],
    where: { orderDate: dbDate(date), status: { not: 'CANCELLED' } },
    _count: { _all: true },
  });
  const booked = new Map(counts.map((c) => [c.slotStart, c._count._all]));
  return generateSlots(settings).map((s) => {
    const b = booked.get(s.start) ?? 0;
    return { ...s, booked: b, capacity: settings.slotCapacity, available: b < settings.slotCapacity };
  });
}

