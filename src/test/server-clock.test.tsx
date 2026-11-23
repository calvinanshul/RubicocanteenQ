import { screen, waitFor } from '@testing-library/react';
import { addDays, todayIST } from '../lib/format';
import { calls, mockApi, renderRoute, userOf } from './utils';

// Regression for BUG-03-001: "today" comes from the server, never from the device clock
describe('server clock drives "today"', () => {
  const serverToday = addDays(todayIST(), 1); // the server is a day ahead of this device
  const serverTime = { serverTime: `${serverToday}T04:35:00.000Z`, today: serverToday }; // 10:05 IST

  function api(role: 'EMPLOYEE' | 'MANAGER' | 'STAFF') {
    return mockApi((url) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf(role) };
      if (url.endsWith('/api/time')) return { status: 200, body: serverTime };
      if (url.endsWith('/settings')) return { status: 200, body: { pickupLocation: 'Building 4 · Counter A', orderCutoff: '11:00', maxQtyPerItem: 5 } };
      if (url.includes('/orders/me')) return { status: 200, body: { items: [], page: 1, pageSize: 10, total: 0 } };
      return undefined;
    });
  }

  it("the employee menu asks for the server's today, not the device's", async () => {
    const fetchMock = api('EMPLOYEE');
    renderRoute('/menu');
    await waitFor(() => expect(calls(fetchMock, `/daily-menu?date=${serverToday}`).length).toBeGreaterThan(0));
    expect(calls(fetchMock, `/daily-menu?date=${todayIST()}`)).toHaveLength(0);
  });

  it("the tomorrow tab is the server's tomorrow", async () => {
    const fetchMock = api('EMPLOYEE');
    renderRoute('/menu?day=tomorrow');
    await waitFor(() => expect(calls(fetchMock, `/daily-menu?date=${addDays(serverToday, 1)}`).length).toBeGreaterThan(0));
  });

  it("the daily menu editor defaults to the server's tomorrow", async () => {
    const fetchMock = api('MANAGER');
    renderRoute('/manager/daily-menu');
    await waitFor(() => expect(calls(fetchMock, `/daily-menu?date=${addDays(serverToday, 1)}`).length).toBeGreaterThan(0));
  });

  it('the counter clock shows server time', async () => {
    api('STAFF');
    renderRoute('/staff/prep');
    expect(await screen.findByLabelText('Time 10:05')).toBeInTheDocument();
  });
});

// Regression for BUG-03-002: a failed clock read shows an error and retries instead of loading forever
describe('server clock unavailable', () => {
  it('checkout shows an error with a retry that reads the clock again', async () => {
    let calls = 0;
    mockApi((url) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('EMPLOYEE') };
      if (url.endsWith('/settings')) return { status: 200, body: { pickupLocation: 'Building 4 · Counter A', orderCutoff: '11:00' } };
      if (url.endsWith('/api/time')) {
        calls += 1;
        return { status: 500, body: { serverTime: undefined, error: { code: 'INTERNAL_ERROR', message: 'down' } } };
      }
      return undefined;
    });
    renderRoute('/menu/checkout');
    const retry = await screen.findByRole('button', { name: /Try again/ }, { timeout: 6000 });
    const before = calls;
    retry.click();
    await waitFor(() => expect(calls).toBeGreaterThan(before));
  });
});
