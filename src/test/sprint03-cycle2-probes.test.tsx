/** Sprint 03 cycle 2 probes around the BUG-03-001 fix (server clock). */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderRoute, userOf } from './utils';

const settings = { status: 200, body: { pickupLocation: 'Building 4 · Counter A', orderCutoff: '11:00', maxQtyPerItem: 5 } };
// `serverTime` key present so the shared mock passes this 500 through instead of its default clock
const timeDown = { status: 500, body: { serverTime: undefined, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } } };

function api(role: 'EMPLOYEE' | 'MANAGER') {
  return mockApi((url) => {
    if (url.endsWith('/auth/me')) return { status: 200, body: userOf(role) };
    if (url.endsWith('/api/time')) return timeDown;
    if (url.endsWith('/settings')) return settings;
    if (url.includes('/orders/me')) return { status: 200, body: { items: [], page: 1, pageSize: 10, total: 0 } };
    if (url.includes('/menu-items')) return { status: 200, body: [] };
    return undefined;
  });
}

describe('cycle 2: when the server clock cannot be read', () => {
  it('EC-03-UI12 the employee menu shows an error with a retry, not an endless skeleton', async () => {
    api('EMPLOYEE');
    renderRoute('/menu');
    expect(await screen.findByRole('button', { name: /Try again/ }, { timeout: 6000 })).toBeInTheDocument();
  });

  it('EC-03-UI13 the daily menu editor shows an error with a retry, not an endless skeleton', async () => {
    api('MANAGER');
    renderRoute('/manager/daily-menu');
    expect(await screen.findByRole('button', { name: /Try again/ }, { timeout: 6000 })).toBeInTheDocument();
  });
});

describe('cycle 2: console after the hook-order fix', () => {
  it('EC-03-UI14 logging out of the manager console does not crash', async () => {
    mockApi((url) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('MANAGER') };
      if (url.endsWith('/settings')) return settings;
      if (url.endsWith('/auth/logout')) return { status: 204 };
      if (url.includes('/reports/dashboard')) return { status: 200, body: { date: '2030-05-14', kpis: { orders: 0, revenuePaise: 0, avgOrderPaise: 0, collected: 0, collectedPct: 0, pending: 0, cancelled: 0, noShow: 0, vsYesterdayPct: null }, items: [], slots: [], capacityPerSlot: 30, peakSlot: null, lastUpdated: '2030-05-14T07:00:00.000Z' } };
      return undefined;
    });
    renderRoute('/manager/dashboard');
    await screen.findByText('Canteen overview');
    await userEvent.click(screen.getAllByRole('button', { name: 'Log out' })[0] as HTMLElement);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument());
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});

describe('cycle 3: recovering after the clock comes back', () => {
  it('EC-03-UI15 "Try again" on the menu loads the menu once the server clock answers', async () => {
    let up = false;
    mockApi((url) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('EMPLOYEE') };
      if (url.endsWith('/settings')) return settings;
      if (url.endsWith('/api/time')) {
        return up ? { status: 200, body: { serverTime: new Date().toISOString(), today: new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10) } } : timeDown;
      }
      if (url.includes('/orders/me')) return { status: 200, body: { items: [], page: 1, pageSize: 10, total: 0 } };
      if (url.includes('/daily-menu?date=')) {
        const date = new URL(url, 'http://x').searchParams.get('date') ?? '';
        return { status: 200, body: { date, serverTime: new Date().toISOString(), orderingOpen: true, cutoff: '11:00', closed: false, pickupLocation: 'Building 4 · Counter A', items: [{ dailyMenuItemId: 1, menuItemId: 1, name: 'Veg Biryani', description: null, pricePaise: 12000, diet: 'VEG', category: 'MAIN', quantity: 10, ordered: 0, remaining: 10 }] } };
      }
      return undefined;
    });
    renderRoute('/menu');
    const retry = await screen.findByRole('button', { name: /Try again/ }, { timeout: 6000 });
    up = true;
    await userEvent.click(retry);
    expect(await screen.findByRole('article', { name: 'Veg Biryani' })).toBeInTheDocument();
  });
});
