'use client';

import { UnexpectedErrorPage } from '@/screens/ErrorPages';

/** Error boundary for every page (an unexpected render error). */
export default function ErrorBoundary() {
  return <UnexpectedErrorPage />;
}
