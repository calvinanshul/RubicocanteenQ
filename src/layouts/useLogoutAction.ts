'use client';

import { useRouter } from 'next/navigation';
import { useLogout } from '../api/hooks';

/** Log out, clear cached data and replace history so Back shows the login page (US-02 AC5). */
export function useLogoutAction() {
  const logout = useLogout();
  const router = useRouter();
  return {
    pending: logout.isPending,
    run: () => logout.mutate(undefined, { onSettled: () => router.replace('/login') }),
  };
}
