import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Next.js routing outside Next: an in-memory router (see ./nextMock)
vi.mock('next/navigation', () => import('./nextMock'));
vi.mock('next/link', async () => {
  const m = await import('./nextMock');
  return { default: m.Link };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
