import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Role } from '@/shared';
import { createApp } from './nextApp';
import { prisma } from '@/server/db';

export const app = createApp();
export { prisma };

export const TEST_PASSWORD = 'Lunch2026';
let hash: string | undefined;

let counter = 0;
export function uniqueEmail(prefix = 'user'): string {
  counter += 1;
  return `${prefix}.${Date.now().toString(36)}.${counter}.${Math.random().toString(36).slice(2, 6)}@rubicotech.com`;
}

/** Create a user directly in the DB (fast: one shared bcrypt hash). */
export async function createUser(opts: { role?: Role; isActive?: boolean; email?: string; name?: string } = {}) {
  hash ??= await bcrypt.hash(TEST_PASSWORD, 12);
  return prisma.user.create({
    data: {
      email: opts.email ?? uniqueEmail(opts.role?.toLowerCase()),
      name: opts.name ?? 'Test User',
      role: opts.role ?? 'EMPLOYEE',
      isActive: opts.isActive ?? true,
      passwordHash: hash,
    },
  });
}

/** A Supertest agent logged in as a new user with the given role. */
export async function agentFor(role: Role = 'EMPLOYEE') {
  const user = await createUser({ role });
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD });
  if (res.status !== 200) throw new Error(`Login failed for ${role}: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user };
}

/** Header value for the test clock: an IST wall-clock time. */
export function ist(dateTime: string): string {
  return `${dateTime}+05:30`;
}

/** Active seeded dishes, by name. */
export async function dishId(name: string): Promise<number> {
  const item = await prisma.menuItem.findFirstOrThrow({ where: { name, isActive: true } });
  return item.id;
}

export function expectErrorShape(body: unknown, code: string): void {
  const b = body as { error?: { code?: unknown; message?: unknown } };
  if (!b.error || b.error.code !== code || typeof b.error.message !== 'string') {
    throw new Error(`Expected error ${code}, got ${JSON.stringify(body)}`);
  }
}

/* ---------- Helpers for Sprint 2–4 acceptance scripts ---------- */
import type { Diet, Category } from '@/shared';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';

type Agent = ReturnType<typeof request.agent>;

/** IST wall-clock instant for the x-test-now header: at('2030-03-05', '10:15'). */
export function at(date: string, time: string): string {
  return ist(`${date}T${time}:00`);
}

let dishCounter = 0;
/** A fresh dish on the given date's menu (unique name, so tests never share stock). */
export async function seedDailyItem(opts: {
  date: string;
  quantity: number;
  orderedQty?: number;
  pricePaise?: number;
  name?: string;
  diet?: Diet;
  category?: Category;
}) {
  dishCounter += 1;
  const item = await prisma.menuItem.create({
    data: {
      name: opts.name ?? `Test Dish ${Date.now().toString(36)}-${dishCounter}`,
      category: opts.category ?? 'MAIN',
      diet: opts.diet ?? 'VEG',
      pricePaise: opts.pricePaise ?? 12000,
    },
  });
  const dmi = await prisma.dailyMenuItem.create({
    data: { menuDate: new Date(`${opts.date}T00:00:00Z`), menuItemId: item.id, quantity: opts.quantity, orderedQty: opts.orderedQty ?? 0 },
  });
  return { dailyMenuItemId: dmi.id, menuItemId: item.id, name: item.name, pricePaise: item.pricePaise };
}

export interface OrderBody {
  date: string;
  slotStart?: string;
  items: { dailyMenuItemId: number; qty: number }[];
}

const DEFAULT_SLOTS = ['12:30', '12:45', '13:00', '13:15', '13:30', '13:45', '14:00', '14:15'];
let slotTurn = 0;

/**
 * POST /api/orders (O1) at an IST time, with an Idempotency-Key. When the body has no slotStart, slots are
 * used round-robin, so scripts sharing a date don't exhaust one slot's capacity (30) and trip SLOT_FULL.
 */
export function placeOrder(agent: Agent, body: OrderBody, now: string, key: string = randomUUID()) {
  const slotStart = body.slotStart ?? DEFAULT_SLOTS[slotTurn++ % DEFAULT_SLOTS.length];
  return agent.post('/api/orders').set('x-test-now', now).set('Idempotency-Key', key).send({ ...body, slotStart });
}

/** Remaining stock of a daily-menu item, straight from the DB. */
export async function remaining(dailyMenuItemId: number): Promise<number> {
  const row = await prisma.dailyMenuItem.findUniqueOrThrow({ where: { id: dailyMenuItemId } });
  return row.quantity - row.orderedQty;
}

/** Temporarily change settings; returns a restore function for `finally`. */
export async function withSettings(patch: Prisma.SettingsUpdateInput): Promise<() => Promise<void>> {
  const before = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
  await prisma.settings.update({ where: { id: 1 }, data: patch });
  return async () => {
    const { id: _id, updatedAt: _u, ...rest } = before;
    await prisma.settings.update({ where: { id: 1 }, data: rest });
  };
}

/** Insert an order directly (for staff/report scripts that need a known state). */
export async function insertOrder(opts: {
  userId: number;
  date: string;
  slotStart?: string;
  status?: 'PLACED' | 'PREPARING' | 'READY' | 'COLLECTED' | 'CANCELLED' | 'NO_SHOW';
  items: { dailyMenuItemId: number; qty: number; name: string; pricePaise: number }[];
  pickupCode?: string;
}) {
  const code = opts.pickupCode ?? randomCode();
  const total = opts.items.reduce((s, i) => s + i.qty * i.pricePaise, 0);
  const order = await prisma.order.create({
    data: {
      userId: opts.userId,
      orderDate: new Date(`${opts.date}T00:00:00Z`),
      slotStart: opts.slotStart ?? '13:00',
      status: opts.status ?? 'PLACED',
      totalPaise: total,
      pickupCode: code,
      items: {
        create: opts.items.map((i) => ({ dailyMenuItemId: i.dailyMenuItemId, itemNameSnapshot: i.name, unitPricePaiseSnapshot: i.pricePaise, qty: i.qty })),
      },
    },
  });
  if (opts.status !== 'CANCELLED') {
    for (const i of opts.items) {
      await prisma.dailyMenuItem.update({ where: { id: i.dailyMenuItemId }, data: { orderedQty: { increment: i.qty } } });
    }
  }
  return order;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomCode(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export const PICKUP_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
