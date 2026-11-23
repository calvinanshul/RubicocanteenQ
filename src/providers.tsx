'use client';

import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { ApiError, setUnauthorizedHandler } from './api/client';
import { ToastProvider } from './components/ui';
import { FullPageLoader } from './layouts/FullPageLoader';
import { SlowLoader } from './layouts/SlowLoader';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache(),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 1,
      },
    },
  });
}

/** Data, toasts and the slow-request loader. */
export function AppProviders({ client, children }: { client: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <SlowLoader />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}

/** Mounted once by the root layout. */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  const router = useRouter();

  useEffect(() => {
    // A 401 from any data request: drop cached data and go to login (US-02 AC6)
    setUnauthorizedHandler((code) => {
      client.setQueryData(['me'], { user: null, expired: code === 'SESSION_EXPIRED' });
      router.replace(`/login${code === 'SESSION_EXPIRED' ? '?expired=1' : ''}`);
    });
  }, [client, router]);

  return (
    <AppProviders client={client}>
      <Suspense fallback={<FullPageLoader />}>{children}</Suspense>
    </AppProviders>
  );
}
