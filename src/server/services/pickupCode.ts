import { randomInt } from 'node:crypto';
import { PICKUP_CODE_ALPHABET } from '@/shared';

/** BR8: 6 characters from a 32-character alphabet without look-alikes, from a CSPRNG (32^6 ≈ 1.07 billion). */
export function generatePickupCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += PICKUP_CODE_ALPHABET[randomInt(PICKUP_CODE_ALPHABET.length)];
  return code;
}
