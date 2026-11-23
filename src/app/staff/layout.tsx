import type { ReactNode } from 'react';
import { RequireRole } from '@/layouts/RequireRole';
import { StaffShell } from '@/layouts/StaffShell';

/** Counter screens (queue, scan, prep) are for staff only; managers work from the console. */
export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={['STAFF']}>
      <StaffShell>{children}</StaffShell>
    </RequireRole>
  );
}
