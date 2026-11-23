import type { ReactNode } from 'react';
import { CartProvider } from '@/features/cart/CartContext';
import { EmployeeShell } from '@/layouts/EmployeeShell';
import { RequireRole } from '@/layouts/RequireRole';

/** Employee screens: menu, checkout, order pass, my orders, profile. */
export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={['EMPLOYEE']}>
      <CartProvider>
        <EmployeeShell>{children}</EmployeeShell>
      </CartProvider>
    </RequireRole>
  );
}
