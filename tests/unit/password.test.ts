import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/server/auth/password';

// TC-U-08 Password hashing (US-01 AC6, BR10)
describe('password hashing (TC-U-08)', () => {
  it('hashes with bcrypt cost 12 and verifies', async () => {
    const hash = await hashPassword('Lunch2026');
    expect(hash).not.toBe('Lunch2026');
    expect(hash.startsWith('$2b$12$')).toBe(true);
    expect(await verifyPassword('Lunch2026', hash)).toBe(true);
    expect(await verifyPassword('Lunch2027', hash)).toBe(false);
  });
});
