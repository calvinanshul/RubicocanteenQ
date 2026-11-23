'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ROLE_HOME, type Role } from '@/shared';
import { Navigate } from '@/lib/navigation';
import { useMe } from '../api/hooks';
import { FullPageLoader } from './FullPageLoader';

/**
 * Route guard (convenience only; the API's role checks are the real security boundary).
 * Not logged in → /login, wrong role → /403.
 */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { data, isPending } = useMe();
  const pathname = usePathname() ?? '/';
  if (isPending) return <FullPageLoader />;
  if (!data?.user) {
    const params = new URLSearchParams();
    if (data?.expired) params.set('expired', '1');
    if (pathname !== '/') params.set('next', pathname);
    const qs = params.toString();
    return <Navigate to={`/login${qs ? `?${qs}` : ''}`} />;
  }
  if (!roles.includes(data.user.role)) return <Navigate to="/403" />;
  return <>{children}</>;
}

/** Login and sign-up: a logged-in user goes to their role home. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { data, isPending } = useMe();
  if (isPending) return <FullPageLoader />;
  if (data?.user) return <Navigate to={ROLE_HOME[data.user.role]} />;
  return <>{children}</>;
}

/** "/" → role home or login. */
export function HomeRedirect() {
  const { data, isPending } = useMe();
  if (isPending) return <FullPageLoader />;
  return <Navigate to={data?.user ? ROLE_HOME[data.user.role] : '/login'} />;
}
