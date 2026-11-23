import { Prisma, type MenuItem } from '@prisma/client';
import type { MenuItemDto, MenuItemInput } from '@/shared';
import { prisma } from '../db';
import { AppError } from '../errors';

export function toMenuItemDto(m: MenuItem): MenuItemDto {
  return {
    id: m.id,
    name: m.name,
    description: m.description,
    category: m.category,
    pricePaise: m.pricePaise,
    diet: m.diet,
    isActive: m.isActive,
  };
}

/** M1 */
export async function listMenuItems(activeOnly: boolean): Promise<MenuItemDto[]> {
  const items = await prisma.menuItem.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  });
  return items.map(toMenuItemDto);
}

/** M2 */
export async function createMenuItem(input: MenuItemInput): Promise<MenuItemDto> {
  try {
    const item = await prisma.menuItem.create({ data: { ...input, description: input.description ?? null } });
    return toMenuItemDto(item);
  } catch (err) {
    // menu_item_active_name partial unique index (US-06 AC4)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw duplicateName();
    }
    throw err;
  }
}

function duplicateName(): AppError {
  return new AppError('DUPLICATE_NAME', 409, 'An item with this name already exists', {
    name: 'An item with this name already exists',
  });
}

/** M3: edit any subset of fields, archive (isActive false) or restore. Existing orders keep their snapshots (BR6). */
export async function updateMenuItem(
  id: number,
  patch: Partial<MenuItemInput> & { isActive?: boolean },
  actorId: number,
): Promise<MenuItemDto> {
  const before = await prisma.menuItem.findUnique({ where: { id } });
  if (!before) throw new AppError('NOT_FOUND', 404, 'Menu item not found');
  const data: Prisma.MenuItemUpdateInput = { ...patch };
  if ('description' in patch) data.description = patch.description || null;
  if (Object.keys(data).length === 0) return toMenuItemDto(before); // empty PATCH: no-op
  try {
    const item = await prisma.menuItem.update({ where: { id }, data });
    await prisma.auditLog.create({
      data: { actorId, action: 'MENU_ITEM_UPDATED', entity: 'MenuItem', entityId: id, before: toMenuItemDto(before) as object, after: toMenuItemDto(item) as object },
    });
    return toMenuItemDto(item);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw duplicateName();
    throw err;
  }
}
