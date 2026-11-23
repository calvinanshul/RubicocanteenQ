'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, type ComponentProps, type ReactNode } from 'react';

/** A nav link is active on its own path and on any path below it (`/menu` for `/menu/checkout`). */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavLinkProps = Omit<ComponentProps<typeof Link>, 'href' | 'className' | 'children'> & {
  href: string;
  className?: string | ((state: { isActive: boolean }) => string);
  children?: ReactNode | ((state: { isActive: boolean }) => ReactNode);
};

/** next/link with an active state (className / children may be functions of it) and aria-current. */
export function NavLink({ href, className, children, ...rest }: NavLinkProps) {
  const isActive = isActivePath(usePathname() ?? '', href);
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={typeof className === 'function' ? className({ isActive }) : className}
      {...rest}
    >
      {typeof children === 'function' ? children({ isActive }) : children}
    </Link>
  );
}

/** Client-side redirect while rendering (replaces history, so Back doesn't return here). */
export function Navigate({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return null;
}

/**
 * Search params plus a setter that replaces them (no new history entry by default), for screens that keep
 * their date or tab in the URL.
 */
export function useSearchParamsState(): [URLSearchParams, (next: Record<string, string>, opts?: { replace?: boolean }) => void] {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const set = useCallback(
    (next: Record<string, string>, opts: { replace?: boolean } = { replace: true }) => {
      const qs = new URLSearchParams(next).toString();
      const url = `${pathname}${qs ? `?${qs}` : ''}`;
      if (opts.replace === false) router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [pathname, router],
  );
  return [new URLSearchParams(params?.toString() ?? ''), set];
}
