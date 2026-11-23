export const ROLES = ['EMPLOYEE', 'STAFF', 'MANAGER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUSES = ['PLACED', 'PREPARING', 'READY', 'COLLECTED', 'CANCELLED', 'NO_SHOW'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const CATEGORIES = ['MAIN', 'COMBO', 'LIGHT', 'SIDE', 'DESSERT', 'BEVERAGE'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Labels shown on dish tiles (design decision D2). */
export const CATEGORY_LABELS: Record<Category, string> = {
  MAIN: 'MAINS',
  COMBO: 'COMBO',
  LIGHT: 'LIGHT',
  SIDE: 'SIDE',
  DESSERT: 'DESSERT',
  BEVERAGE: 'DRINK',
};

export const DIETS = ['VEG', 'NON_VEG', 'JAIN'] as const;
export type Diet = (typeof DIETS)[number];

export const SLOT_MINUTES_OPTIONS = [10, 15, 20, 30] as const;

/** Where each role lands after login (US-02 AC1). */
export const ROLE_HOME: Record<Role, string> = {
  EMPLOYEE: '/menu',
  STAFF: '/staff/queue',
  MANAGER: '/manager/dashboard',
  ADMIN: '/admin/users',
};

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'INVALID_JSON',
  'UNAUTHENTICATED',
  'INVALID_CREDENTIALS',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'DOMAIN_NOT_ALLOWED',
  'ACCOUNT_DISABLED',
  'NOT_FOUND',
  'EMAIL_EXISTS',
  'LAST_ADMIN',
  'DUPLICATE_NAME',
  'DUPLICATE_DATE',
  'QTY_BELOW_ORDERED',
  'CUTOFF_PASSED',
  'OUT_OF_STOCK',
  'ORDER_EXISTS_FOR_DATE',
  'SLOT_FULL',
  'INVALID_STATUS',
  'INVALID_TRANSITION',
  'ALREADY_COLLECTED',
  'WRONG_DATE',
  'CANTEEN_CLOSED',
  'MENU_NOT_PUBLISHED',
  'TOO_MANY_ATTEMPTS',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; fields?: Record<string, string> };
}

/** Pickup code alphabet: no I, O, 0 or 1 (BR8). */
export const PICKUP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
