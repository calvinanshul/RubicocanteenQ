import type { ReactNode } from 'react';
import { PublicOnly } from '@/layouts/RequireRole';

/** Login and sign-up: a logged-in user goes to their role home. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <PublicOnly>{children}</PublicOnly>;
}
