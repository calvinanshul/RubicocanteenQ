import { z } from 'zod';
import { dateSchema } from '@/shared';
import { dbDate } from '@/server/adapters/clock';
import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import { noContent, route } from '@/server/http/route';

/** S5: ADMIN removes a holiday; 404 if it isn't there. */
export const DELETE = route({ roles: ['ADMIN'], params: z.object({ date: dateSchema }) }, async ({ params }) => {
  const { count } = await prisma.closedDate.deleteMany({ where: { date: dbDate(params.date) } });
  if (count === 0) throw new AppError('NOT_FOUND', 404, 'This date is not closed');
  return noContent();
});
