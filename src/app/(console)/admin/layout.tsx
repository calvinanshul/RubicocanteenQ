import type { ReactNode } from 'react';
import { RequireRole } from '@/layouts/RequireRole';

/** Users and settings are admin-only (D19). */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RequireRole roles={['ADMIN']}>{children}</RequireRole>;
}
