import bcrypt from 'bcryptjs';

/** BR10: bcrypt with cost 12. */
export const BCRYPT_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

let dummyHash: Promise<string> | undefined;

/** Compare against a throwaway hash so unknown emails take as long as wrong passwords (US-02 AC2). */
export async function burnPasswordCheck(plain: string): Promise<void> {
  dummyHash ??= bcrypt.hash('not-a-real-password-1', BCRYPT_COST);
  await bcrypt.compare(plain, await dummyHash);
}
