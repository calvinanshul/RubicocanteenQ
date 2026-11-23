/**
 * In-memory stand-ins for `next/navigation` and `next/link` (installed for every test in setup.ts).
 * Navigation updates window.history too, so tests can also assert on window.location.
 */
import { forwardRef, useMemo, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';

type Listener = () => void;
const listeners = new Set<Listener>();
let href = '/';
let matchParams: (pathname: string) => Record<string, string> = () => ({});

function split(url: string): { pathname: string; search: string } {
  const u = new URL(url, 'http://localhost');
  return { pathname: u.pathname, search: u.search };
}

function emit() {
  listeners.forEach((l) => l());
}

export const memoryRouter = {
  get state() {
    return { location: split(href) };
  },
  /** Start a test at `url` (no listeners notified: call before rendering). */
  reset(url: string) {
    href = url;
    window.history.replaceState({}, '', url);
  },
  navigate(url: string, opts: { replace?: boolean } = {}) {
    const { pathname, search } = split(new URL(url, `http://localhost${split(href).pathname}`).toString());
    href = `${pathname}${search}`;
    if (opts.replace) window.history.replaceState({}, '', href);
    else window.history.pushState({}, '', href);
    emit();
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  /** The harness registers how to read dynamic segments (`/orders/[id]`) from a path. */
  setParamMatcher(fn: (pathname: string) => Record<string, string>) {
    matchParams = fn;
  },
};

function useHref(): string {
  return useSyncExternalStore(memoryRouter.subscribe, () => href, () => href);
}

/* ---- next/navigation ---- */

export function usePathname(): string {
  return split(useHref()).pathname;
}

export function useSearchParams(): URLSearchParams {
  const search = split(useHref()).search;
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useParams<T extends Record<string, string>>(): T {
  const pathname = usePathname();
  return useMemo(() => matchParams(pathname) as T, [pathname]);
}

const router = {
  push: (url: string) => memoryRouter.navigate(url),
  replace: (url: string) => memoryRouter.navigate(url, { replace: true }),
  back: () => window.history.back(),
  forward: () => window.history.forward(),
  refresh: () => undefined,
  prefetch: () => undefined,
};

export function useRouter() {
  return router;
}

export class NotFoundError extends Error {
  readonly digest = 'NEXT_NOT_FOUND';
}

export function notFound(): never {
  throw new NotFoundError('not found');
}

export function redirect(url: string): never {
  memoryRouter.navigate(url, { replace: true });
  throw new Error(`redirect to ${url}`);
}

/* ---- next/link ---- */

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string; replace?: boolean; prefetch?: boolean; scroll?: boolean };

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ href: to, replace, prefetch: _p, scroll: _s, onClick, ...rest }, ref) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    memoryRouter.navigate(to, { replace });
  };
  return <a ref={ref} href={to} onClick={handle} {...rest} />;
});
