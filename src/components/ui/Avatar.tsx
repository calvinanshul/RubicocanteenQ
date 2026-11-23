import type { Role } from '@/shared';
import { initials } from '../../lib/format';

/** Initials avatar (D4): terracotta for employees, espresso for staff/manager/admin. */
export function Avatar({ name, role, size = 36 }: { name: string; role: Role; size?: number }) {
  const bg = role === 'EMPLOYEE' ? 'bg-primary' : 'bg-text-primary';
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${bg}`}
    >
      {initials(name)}
    </span>
  );
}
