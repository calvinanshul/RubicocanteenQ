import { Prisma } from '@prisma/client';
import { closedDateSchema, closedDatesQuerySchema, type ClosedDateDto } from '@/shared';
import { dbDate, fromDbDate } from '@/server/adapters/clock';
import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import { json, route } from '@/server/http/route';

export const dynamic = 'force-dynamic';

/** S3: holidays in a range (any logged-in user), oldest first. */
export const GET = route({ query: closedDatesQuerySchema }, async ({ query: { from, to } }) => {
  const rows = await prisma.closedDate.findMany({
    where: { date: { ...(from ? { gte: dbDate(from) } : {}), ...(to ? { lte: dbDate(to) } : {}) } },
    orderBy: { date: 'asc' },
    take: 500,
  });
  return rows.map((r): ClosedDateDto => ({ date: fromDbDate(r.date), reason: r.reason }));
});

/** S4: ADMIN adds a holiday; 409 if the date is already closed. */
export const POST = route({ roles: ['ADMIN'], body: closedDateSchema }, async ({ body: { date, reason } }) => {
  try {
    await prisma.closedDate.create({ data: { date: dbDate(date), reason } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError('DUPLICATE_DATE', 409, 'This date is already closed', { date: 'This date is already closed' });
    }
    throw err;
  }
  return json({ date, reason } satisfies ClosedDateDto, { status: 201 });
});
