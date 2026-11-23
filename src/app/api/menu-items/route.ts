import { z } from 'zod';
import { menuItemSchema } from '@/shared';
import { json, route } from '@/server/http/route';
import { createMenuItem, listMenuItems } from '@/server/services/menuService';

export const dynamic = 'force-dynamic';

const listQuery = z.object({ active: z.enum(['true', 'false']).optional() });

/** M1: `active=true` (default) lists active items; `active=false` lists all, archived included. */
export const GET = route({ roles: ['MANAGER'], query: listQuery }, ({ query }) => listMenuItems(query.active !== 'false'));

/** M2 */
export const POST = route({ roles: ['MANAGER'], body: menuItemSchema }, async ({ body }) =>
  json(await createMenuItem(body), { status: 201 }),
);
