import type { Category, Diet, OrderStatus, Role } from './constants';

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  employeeCode: string | null;
  department: string | null;
}

export interface PublicSettings {
  orderCutoff: string;
  slotStart: string;
  slotEnd: string;
  slotMinutes: number;
  slotCapacity: number;
  pickupLocation: string;
  noShowGraceMinutes: number;
  maxQtyPerItem: number;
  closedWeekdays: number[];
  allowedDomains?: string[];
}

export interface MenuItemDto {
  id: number;
  name: string;
  description: string | null;
  category: Category;
  pricePaise: number;
  diet: Diet;
  isActive: boolean;
}

export interface DailyMenuItemDto {
  dailyMenuItemId: number;
  menuItemId: number;
  name: string;
  description: string | null;
  pricePaise: number;
  diet: Diet;
  category: Category;
  quantity: number;
  ordered: number;
  remaining: number;
}

export interface DailyMenuDto {
  date: string;
  /** Server "now" (honours the test clock) so the client can run the cut-off countdown. */
  serverTime: string;
  orderingOpen: boolean;
  cutoff: string;
  closed: boolean;
  pickupLocation: string;
  items: DailyMenuItemDto[];
}


export interface OrderItemDto {
  name: string;
  qty: number;
  unitPricePaise: number;
}

export interface OrderDto {
  id: number;
  status: OrderStatus;
  date: string;
  slotStart: string;
  slotEnd: string;
  pickupLocation: string;
  createdAt: string;
  pickupCode: string;
  totalPaise: number;
  items: OrderItemDto[];
  /** True while the employee may still cancel (PLACED and before the cut-off). */
  cancellable: boolean;
  cutoff: string;
  readyAt: string | null;
  collectedAt: string | null;
  cancelledAt: string | null;
  /** Server "now" when the response was built (honours the test clock), for countdowns. */
  serverTime: string;
}

export interface SlotDto {
  start: string;
  end: string;
  booked: number;
  capacity: number;
  available: boolean;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Staff / manager view of an order (Q1, Q3, Q4). */
export interface StaffOrderDto {
  id: number;
  pickupCode: string;
  status: OrderStatus;
  date: string;
  slotStart: string;
  slotEnd: string;
  employeeName: string;
  department: string | null;
  items: { name: string; qty: number; diet: Diet | null }[];
  totalPaise: number;
  readyAt: string | null;
  collectedAt: string | null;
}

export interface QueueDto {
  date: string;
  slots: { start: string; end: string; orders: StaffOrderDto[] }[];
  counts: Record<OrderStatus, number> & { ALL: number };
  lastUpdated: string;
  serverTime: string;
}

export interface VerifyDto {
  order: StaffOrderDto;
  warning: 'NOT_READY' | null;
}

export interface PrepItemDto {
  name: string;
  diet: Diet;
  category: Category;
  qty: number;
  quantity: number;
  soldOut: boolean;
}

export interface DashboardDto {
  date: string;
  kpis: {
    orders: number;
    revenuePaise: number;
    avgOrderPaise: number;
    collected: number;
    collectedPct: number;
    pending: number;
    cancelled: number;
    noShow: number;
    vsYesterdayPct: number | null;
  };
  items: { name: string; diet: Diet; ordered: number; quantity: number; remaining: number; soldOut: boolean }[];
  slots: { start: string; count: number }[];
  capacityPerSlot: number;
  peakSlot: string | null;
  lastUpdated: string;
}

/* ---------------- Sprint 4: admin, settings, exports ---------------- */

/** U1 row / U2 response. */
export interface AdminUserDto {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  employeeCode: string | null;
  department: string | null;
  createdAt: string;
}

/** U1 response: a page plus per-role counts for the filter chips (same search text). */
export interface UsersPage extends Page<AdminUserDto> {
  roleCounts: Record<Role | 'ALL', number>;
}

/** S3 row. */
export interface ClosedDateDto {
  date: string;
  reason: string;
}

/** O2 extra: this month's billed orders on the server clock (S6 header). */
export interface MyOrdersSummary {
  month: string;
  orders: number;
  totalPaise: number;
}

export interface MyOrdersPage extends Page<OrderDto> {
  summary: MyOrdersSummary;
}
