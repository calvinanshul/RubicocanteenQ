import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/server/env';

const base = { DATABASE_URL: 'postgresql://x', SESSION_SECRET: 'x'.repeat(32) };

// BE-72 / TC-API-SYS-02 (start-up guard)
describe('environment validation', () => {
  it('refuses the test clock in production', () => {
    expect(() => parseEnv({ ...base, APP_ENV: 'production', ENABLE_TEST_CLOCK: 'true' })).toThrow(/ENABLE_TEST_CLOCK/);
  });
  it('allows production without the test clock', () => {
    expect(parseEnv({ ...base, APP_ENV: 'production' }).ENABLE_TEST_CLOCK).toBe(false);
  });
  it('requires a long session secret', () => {
    expect(() => parseEnv({ ...base, SESSION_SECRET: 'short' })).toThrow(/SESSION_SECRET/);
  });
  it('defaults the environment and web origin', () => {
    const e = parseEnv(base);
    expect(e.WEB_ORIGIN).toBe('http://localhost:3000');
    expect(e.APP_ENV).toBe('development');
  });
});
