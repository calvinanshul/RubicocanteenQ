import type { Role } from '@/shared';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  employeeCode: string | null;
  department: string | null;
}
