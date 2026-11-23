import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineWorkspace } from 'vitest/config';
import { TEST_ENV } from './tests/testDb';

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };

export default defineWorkspace([
  {
    // React screens, layouts and components (jsdom)
    plugins: [react()],
    resolve: { alias },
    test: {
      name: 'web',
      include: ['src/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  },
  {
    // Server and shared unit tests (no database)
    resolve: { alias },
    test: {
      name: 'node',
      include: ['tests/unit/**/*.test.ts', 'tests/shared/**/*.test.ts'],
      env: TEST_ENV,
      coverage: { provider: 'v8', include: ['src/server/services/**', 'src/server/auth/**', 'src/server/adapters/**'] },
    },
  },
]);
