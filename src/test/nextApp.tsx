/// <reference types="vite/client" />
/**
 * Renders the real App Router tree (src/app) for a path, the way Next.js would: the page wrapped in every
 * layout above it, error.tsx as the error boundary and not-found.tsx for unknown paths. The root layout
 * (<html>/<body>) is replaced by the app providers. Navigation comes from ./nextMock.
 */
import type { QueryClient } from '@tanstack/react-query';
import { Component, Suspense, useEffect, useState, useSyncExternalStore, type ComponentType, type ReactNode } from 'react';
import { setUnauthorizedHandler } from '../api/client';
import { FullPageLoader } from '../layouts/FullPageLoader';
import { AppProviders, createQueryClient } from '../providers';
import { memoryRouter, NotFoundError } from './nextMock';

type Mod = { default: ComponentType<{ children?: ReactNode }> };

const pages = import.meta.glob<Mod>('../app/**/page.tsx', { eager: true });
const layouts = import.meta.glob<Mod>('../app/**/layout.tsx', { eager: true });
const NotFound = (import.meta.glob<Mod>('../app/not-found.tsx', { eager: true })['../app/not-found.tsx'] as Mod).default;
const ErrorView = (import.meta.glob<Mod>('../app/error.tsx', { eager: true })['../app/error.tsx'] as Mod).default;

interface RouteDef {
  segments: string[];
  page: Mod['default'];
  layouts: Mod['default'][];
}

/** `../app/(employee)/orders/[id]/page.tsx` → url segments ['orders', '[id]'] and its layouts, outermost first. */
const ROUTES: RouteDef[] = Object.entries(pages)
  .filter(([file]) => !file.includes('/api/'))
  .map(([file, mod]) => {
    const dirs = file.replace(/^\.\.\/app\/?/, '').replace(/\/?page\.tsx$/, '').split('/').filter(Boolean);
    const chain: Mod['default'][] = [];
    for (let i = 1; i <= dirs.length; i++) {
      const layout = layouts[`../app/${dirs.slice(0, i).join('/')}/layout.tsx`];
      if (layout) chain.push(layout.default);
    }
    return { segments: dirs.filter((d) => !/^\(.*\)$/.test(d)), page: mod.default, layouts: chain };
  });

function match(pathname: string): { route: RouteDef; params: Record<string, string> } | undefined {
  const parts = pathname.split('/').filter(Boolean);
  const scored = ROUTES.flatMap((route) => {
    if (route.segments.length !== parts.length) return [];
    const params: Record<string, string> = {};
    let dynamic = 0;
    for (let i = 0; i < parts.length; i++) {
      const seg = route.segments[i] ?? '';
      const part = decodeURIComponent(parts[i] ?? '');
      const name = /^\[(\w+)\]$/.exec(seg)?.[1];
      if (name) {
        params[name] = part;
        dynamic += 1;
      } else if (seg !== part) return [];
    }
    return [{ route, params, dynamic }];
  });
  scored.sort((a, b) => a.dynamic - b.dynamic);
  return scored[0];
}

memoryRouter.setParamMatcher((pathname) => match(pathname)?.params ?? {});

class Boundary extends Component<{ children: ReactNode; resetKey: string }, { error: unknown; key: string }> {
  override state = { error: null as unknown, key: this.props.resetKey };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  static getDerivedStateFromProps(props: { resetKey: string }, state: { error: unknown; key: string }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }
  override render() {
    if (this.state.error instanceof NotFoundError) return <NotFound />;
    if (this.state.error) return <ErrorView />;
    return this.props.children;
  }
}

/** Error boundary that behaves like app/error.tsx (for tests that render a crashing component directly). */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  return <Boundary resetKey="">{children}</Boundary>;
}

function Routes() {
  const href = useSyncExternalStore(memoryRouter.subscribe, () => memoryRouter.state.location.pathname);
  const found = match(href);
  if (!found) return <NotFound />;
  const Page = found.route.page;
  return found.route.layouts.reduceRight<ReactNode>(
    (inner, Layout) => <Layout>{inner}</Layout>,
    <Boundary resetKey={href}>
      <Page />
    </Boundary>,
  );
}

/** The app at memoryRouter's current location, with the same 401 → /login handling as src/providers.tsx. */
export function TestApp({ client }: { client: QueryClient }) {
  useEffect(() => {
    setUnauthorizedHandler((code) => {
      client.setQueryData(['me'], { user: null, expired: code === 'SESSION_EXPIRED' });
      memoryRouter.navigate(`/login${code === 'SESSION_EXPIRED' ? '?expired=1' : ''}`, { replace: true });
    });
  }, [client]);
  return (
    <AppProviders client={client}>
      <Suspense fallback={<FullPageLoader />}>
        <Routes />
      </Suspense>
    </AppProviders>
  );
}

/** Whole app at window.location (like the browser entry point). */
export function App() {
  const [client] = useState(createQueryClient);
  useState(() => memoryRouter.reset(`${window.location.pathname}${window.location.search}`));
  return <TestApp client={client} />;
}
