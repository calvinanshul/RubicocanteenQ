/**
 * Sprint 04 stretch scripts (ST-16 email, ST-17 auto no-show). Enable with SPRINT_STRETCH=1
 * once the stretch story is built. Contract: POST /api/cron/no-show with Bearer CRON_SECRET (X2).
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { sprintActive } from '../../sprintGate';
import { app, at, createUser, insertOrder, prisma, seedDailyItem } from '../helpers';

const stretch = sprintActive(4) && process.env.SPRINT_STRETCH === '1';

describe.skipIf(!stretch)('Sprint 04 stretch · auto no-show (TC-API-SYS-03)', () => {
  it('needs the secret, then marks overdue READY orders and leaves COLLECTED ones', async () => {
    const date = '2030-08-13';
    const dish = await seedDailyItem({ date, quantity: 10 });
    const items = [{ dailyMenuItemId: dish.dailyMenuItemId, qty: 1, name: dish.name, pricePaise: dish.pricePaise }];
    const ready = await insertOrder({ userId: (await createUser()).id, date, slotStart: '13:00', status: 'READY', items });
    const done = await insertOrder({ userId: (await createUser()).id, date, slotStart: '13:00', status: 'COLLECTED', items });
    expect((await request(app).post('/api/cron/no-show')).status).toBe(401);
    const res = await request(app)
      .post('/api/cron/no-show')
      .set('Authorization', `Bearer ${process.env.CRON_SECRET ?? ''}`)
      .set('x-test-now', at(date, '13:46'));
    expect(res.status).toBe(200);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: ready.id } })).status).toBe('NO_SHOW');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: done.id } })).status).toBe('COLLECTED');
  });
});
