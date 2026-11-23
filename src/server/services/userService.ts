import { Prisma, type User } from '@prisma/client';
import { ROLES, type AdminUserDto, type Role, type UserPatchInput, type UsersPage, type UsersQuery } from '@/shared';
import { prisma } from '../db';
import { AppError } from '../errors';

const PAGE_SIZE = 20;
/** Serialises "last admin" checks so two admins can't demote each other at the same moment. */
const ADMIN_LOCK_KEY = 4_040_001;

export function toAdminUserDto(u: User): AdminUserDto {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    employeeCode: u.employeeCode,
    department: u.department,
    createdAt: u.createdAt.toISOString(),
  };
}

/** U1: search by name, email, employee code or department (plain text, case-insensitive), role filter, 20 per page. */
export async function listUsers(query: UsersQuery): Promise<UsersPage> {
  const q = query.q?.trim();
  const search: Prisma.UserWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { employeeCode: { contains: q, mode: 'insensitive' } },
          { department: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};
  const where: Prisma.UserWhereInput = { ...search, ...(query.role ? { role: query.role } : {}) };
  const [total, rows, grouped] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.user.groupBy({ by: ['role'], where: search, _count: { _all: true } }),
  ]);
  const roleCounts = Object.fromEntries([['ALL', 0], ...ROLES.map((r) => [r, 0])]) as Record<Role | 'ALL', number>;
  for (const g of grouped) {
    roleCounts[g.role] = g._count._all;
    roleCounts.ALL += g._count._all;
  }
  return { items: rows.map(toAdminUserDto), page: query.page, pageSize: PAGE_SIZE, total, roleCounts };
}

/**
 * U2: change role, activate/deactivate, employee code, department (US-04).
 * At least one active admin must remain (AC4, 409 LAST_ADMIN). Changes take effect on the user's
 * next request, because `authenticate` reloads the user every time (BR12).
 */
export async function updateUser(id: number, patch: UserPatchInput, actorId: number): Promise<AdminUserDto> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADMIN_LOCK_KEY})`;
    const before = await tx.user.findUnique({ where: { id } });
    if (!before) throw new AppError('NOT_FOUND', 404, 'User not found');

    const losesAdmin = before.role === 'ADMIN' && before.isActive && ((patch.role !== undefined && patch.role !== 'ADMIN') || patch.isActive === false);
    if (losesAdmin) {
      const otherAdmins = await tx.user.count({ where: { role: 'ADMIN', isActive: true, id: { not: id } } });
      if (otherAdmins === 0) throw new AppError('LAST_ADMIN', 409, 'At least one active admin is required.');
    }

    const data: Prisma.UserUpdateInput = {};
    if (patch.role !== undefined) data.role = patch.role;
    if (patch.isActive !== undefined) data.isActive = patch.isActive;
    if (patch.employeeCode !== undefined) data.employeeCode = patch.employeeCode ? patch.employeeCode.toUpperCase() : null;
    if (patch.department !== undefined) data.department = patch.department || null;
    if (Object.keys(data).length === 0) return toAdminUserDto(before);

    const after = await tx.user.update({ where: { id }, data });
    const pick = (u: User) => ({ role: u.role, isActive: u.isActive, employeeCode: u.employeeCode, department: u.department });
    await tx.auditLog.create({
      data: { actorId, action: patch.role !== undefined && patch.role !== before.role ? 'ROLE_CHANGED' : 'USER_UPDATED', entity: 'User', entityId: id, before: pick(before), after: pick(after) },
    });
    return toAdminUserDto(after);
  });
}
