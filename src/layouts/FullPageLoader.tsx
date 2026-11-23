'use client';

import { Spinner } from '../components/ui';

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center text-primary">
      <Spinner label="Loading" />
    </div>
  );
}
