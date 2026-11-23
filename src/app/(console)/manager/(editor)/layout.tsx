import type { ReactNode } from 'react';
import { RequireRole } from '@/layouts/RequireRole';

/** Menu editing is manager-only; admins get 403. */
export default function ManagerOnlyLayout({ children }: { children: ReactNode }) {
  return <RequireRole roles={['MANAGER']}>{children}</RequireRole>;
}
