import { Prisma, type OrderStatus } from '@prisma/client';
import { ORDER_STATUSES, type QueueDto, type StaffOrderDto, type VerifyDto } from '@/shared';
import { combineIST, dbDate, fromDbDate, todayIST } from '../adapters/clock';
import { prisma } from '../db';
import { AppError } from '../errors';
import { assertTransition } from './orderStatus';
import { generateSlots, slotEndOf } from './rules';
import { getSettings } from './settingsService';

const staffInclude = {
  user: { select: { name: true, department: true } },
  items: { include: { dailyMenuItem: { include: { menuItem: { select: { diet: true } } } } } },
} satisfies Prisma.OrderInclude;
type StaffOrder = Prisma.OrderGetPayload<{ include: typeof staffInclude }>;

function toStaffDto(o: StaffOrder, slotMinutes: number): StaffOrderDto {
  return {
    id: o.id,
    pickupCode: o.pickupCode,
    status: o.status,
    date: fromDbDate(o.orderDate),
    slotStart: o.slotStart,
    slotEnd: slotEndOf(o.slotStart, slotMinutes),
    employeeName: o.user.name,
    department: o.user.department,
    items: o.items
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((i) => ({ name: i.itemNameSnapshot, qty: i.qty, diet: i.dailyMenuItem.menuItem.diet })),
    totalPaise: o.totalPaise,
    readyAt: o.readyAt?.toISOString() ?? null,
    collectedAt: o.collectedAt?.toISOString() ?? null,
  };
}

/** "Issues" in the queue tabs = cancelled and no-show orders (D16). */
export type QueueFilter = OrderStatus | 'ISSUES';

/** Q1: one day's orders grouped by slot, with counts per status (US-12 AC1). */
export async function getQueue(date: string, filter: QueueFilter | undefined, nowInstant: Date): Promise<QueueDto> {
  const settings = await getSettings();
  const orders = await prisma.order.findMany({
    where: { orderDate: dbDate(date) },
    include: staffInclude,
    orderBy: [{ slotStart: 'asc' }, { createdAt: 'asc' }],
  });
  const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as QueueDto['counts'];
  counts.ALL = orders.length;
  for (const o of orders) counts[o.status] += 1;

  const matches = (s: OrderStatus) =>
    !filter ? true : filter === 'ISSUES' ? s === 'CANCELLED' || s === 'NO_SHOW' : s === filter;
  const grouped = new Map<string, StaffOrderDto[]>();
  for (const o of orders) {
    if (!matches(o.status)) continue;
    const list = grouped.get(o.slotStart) ?? [];
    list.push(toStaffDto(o, settings.slotMinutes));
    grouped.set(o.slotStart, list);
  }
  const known = generateSlots(settings);
  const starts = [...new Set([...known.map((s) => s.start), ...grouped.keys()])].sort();
  const slots = starts
    .filter((start) => grouped.has(start))
    .map((start) => ({ start, end: slotEndOf(start, settings.slotMinutes), orders: grouped.get(start) ?? [] }));
  const iso = nowInstant.toISOString();
  return { date, slots, counts, lastUpdated: iso, serverTime: iso };
}

async function loadForStaff(where: Prisma.OrderWhereUniqueInput): Promise<StaffOrder> {
  const order = await prisma.order.findUnique({ where, include: staffInclude });
  if (!order) throw new AppError('NOT_FOUND', 404, 'Code not found');
  return order;
}

function timeIST(d: Date): string {
  return new Date(d.getTime() + 330 * 60_000).toISOString().slice(11, 16);
}

function dayMonth(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}`;
}

/** Shared pickup checks for Q3 and Q4 (US-13 AC4–AC7, BR8). */
function assertCollectable(order: StaffOrder, nowInstant: Date): void {
  if (order.status === 'COLLECTED') {
    throw new AppError('ALREADY_COLLECTED', 409, `Already collected at ${order.collectedAt ? timeIST(order.collectedAt) : 'an earlier time'}`);
  }
  if (order.status === 'CANCELLED') throw new AppError('INVALID_STATUS', 409, 'This order was cancelled');
  if (order.status === 'NO_SHOW') throw new AppError('INVALID_STATUS', 409, 'This order was marked as a no-show');
  const date = fromDbDate(order.orderDate);
  if (date !== todayIST(nowInstant)) {
    throw new AppError('WRONG_DATE', 409, `This order is for ${dayMonth(date)}, not today`);
  }
}

/** Q3: look up a pickup code (case-insensitive) and say whether it can be handed over. */
export async function verifyCode(pickupCode: string, nowInstant: Date): Promise<VerifyDto> {
  const [order, settings] = await Promise.all([loadForStaff({ pickupCode }), getSettings()]);
  assertCollectable(order, nowInstant);
  return { order: toStaffDto(order, settings.slotMinutes), warning: order.status === 'READY' ? null : 'NOT_READY' };
}

/** Q4: hand over once. A conditional update makes a second (or concurrent) collect fail (BR8). */
export async function collectOrder(orderId: number, staffId: number, nowInstant: Date): Promise<StaffOrderDto> {
  const settings = await getSettings();
  const order = await loadForStaff({ id: orderId });
  assertCollectable(order, nowInstant);
  const changed = await prisma.order.updateMany({
    where: { id: orderId, status: { in: ['PLACED', 'PREPARING', 'READY'] } },
    // Handing over a PLACED/PREPARING order records READY then COLLECTED (US-13 AC8)
    data: { status: 'COLLECTED', collectedAt: nowInstant, collectedById: staffId, readyAt: order.readyAt ?? nowInstant },
  });
  const fresh = await loadForStaff({ id: orderId });
  if (changed.count === 0) assertCollectable(fresh, nowInstant);
  await prisma.auditLog.create({
    data: { actorId: staffId, action: 'STATUS_CHANGED', entity: 'Order', entityId: orderId, before: { status: order.status }, after: { status: 'COLLECTED' } },
  });
  return toStaffDto(fresh, settings.slotMinutes);
}

/** Q2: Start / Mark ready / No-show (US-12 AC2–AC4). */
export async function changeStatus(
  orderId: number,
  to: Extract<OrderStatus, 'PREPARING' | 'READY' | 'NO_SHOW'>,
  actorId: number,
  nowInstant: Date,
): Promise<StaffOrderDto> {
  const settings = await getSettings();
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: staffInclude });
  if (!order) throw new AppError('NOT_FOUND', 404, 'Order not found');
  assertTransition(order.status, to);
  if (to === 'NO_SHOW') {
    const slotEnd = combineIST(fromDbDate(order.orderDate), slotEndOf(order.slotStart, settings.slotMinutes));
    if (nowInstant.getTime() < slotEnd.getTime()) {
      throw new AppError('INVALID_TRANSITION', 409, "An order can't be marked as a no-show before its slot ends");
    }
  }
  const changed = await prisma.order.updateMany({
    where: { id: orderId, status: order.status },
    data: { status: to, ...(to === 'READY' ? { readyAt: nowInstant } : {}) },
  });
  if (changed.count === 0) throw new AppError('INVALID_TRANSITION', 409, 'This order changed meanwhile. Refresh and try again.');
  await prisma.auditLog.create({
    data: { actorId, action: 'STATUS_CHANGED', entity: 'Order', entityId: orderId, before: { status: order.status }, after: { status: to } },
  });
  return toStaffDto(await loadForStaff({ id: orderId }), settings.slotMinutes);
}
