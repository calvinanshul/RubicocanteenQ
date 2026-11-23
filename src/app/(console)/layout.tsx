import type { ReactNode } from 'react';
import { ConsoleShell } from '@/layouts/ConsoleShell';
import { RequireRole } from '@/layouts/RequireRole';

/** Manager / admin console. */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={['MANAGER', 'ADMIN']}>
      <ConsoleShell>{children}</ConsoleShell>
    </RequireRole>
  );
}
