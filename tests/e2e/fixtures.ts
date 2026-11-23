/** Seed accounts (backend/prisma/seedData.ts) and fixtures prepared by the global setup. */
export const ACCOUNTS = {
  EMPLOYEE: { email: 'priya@rubicotech.com', password: 'Employee@2026', home: '/menu', second: '/profile' },
  STAFF: { email: 'staff@rubicotech.com', password: 'Staff@2026', home: '/staff/queue', second: '/staff/scan' },
  MANAGER: { email: 'manager@rubicotech.com', password: 'Manager@2026', home: '/manager/dashboard', second: '/manager/daily-menu' },
  ADMIN: { email: 'admin@rubicotech.com', password: 'Admin@2026', home: '/admin/users', second: '/admin/settings' },
} as const;

export const E2E_FIXTURES = {
  /** Tomorrow's Chicken Curry: quantity 30 with 25 already ordered. */
  orderedDish: { name: 'Chicken Curry', quantity: 30, ordered: 25 },
} as const;

/** Sprint 2+ fixtures on tomorrow's menu (backend/tests/e2e/seed-e2e.ts). */
export const MENU_FIXTURES = {
  soldOut: 'Paneer Butter Masala',
  scarce: { name: 'Dal Tadka + Rice', left: 3 },
  htmlName: '<img src=x onerror=alert(1)>',
  orderable: 'Veg Biryani',
} as const;
