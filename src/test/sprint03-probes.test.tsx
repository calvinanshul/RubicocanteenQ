/** Sprint 03 cycle 1 tester probes for S7, S8, S9, S10. */
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { todayIST } from '../lib/format';
import { calls, mockApi, renderRoute, userOf } from './utils';

const TODAY = todayIST();
const settings = { status: 200, body: { pickupLocation: 'Building 4 · Counter A', orderCutoff: '11:00', slotStart: '12:30', slotEnd: '14:30', slotMinutes: 15 } };
function order(id: number, code: string, status: string, slot: string, extra: Record<string, unknown> = {}) {
  const end = slot === '12:30' ? '12:45' : slot === '12:45' ? '13:00' : '13:15';
  return { id, pickupCode: code, status, date: TODAY, slotStart: slot, slotEnd: end, employeeName: `Person ${id}`, department: 'Ops', items: [{ name: 'Veg Biryani', qty: 1, diet: 'VEG' }], totalPaise: 12000, readyAt: null, collectedAt: null, ...extra };
}
const queue = {
  date: TODAY,
  slots: [
    { start: '12:30', end: '12:45', orders: [order(1, 'AAAAAA', 'COLLECTED', '12:30', { collectedAt: `${TODAY}T07:05:00.000Z` }), order(2, 'BBBBBB', 'CANCELLED', '12:30')] },
    { start: '12:45', end: '13:00', orders: [order(3, 'CCCCCC', 'PLACED', '12:45'), order(4, 'DDDDDD', 'NO_SHOW', '12:45')] },
    { start: '13:00', end: '13:15', orders: [order(5, 'EEEEEE', 'PREPARING', '13:00')] },
  ],
  counts: { ALL: 5, PLACED: 1, PREPARING: 1, READY: 0, COLLECTED: 1, CANCELLED: 1, NO_SHOW: 1 },
  lastUpdated: `${TODAY}T07:22:00.000Z`,
  serverTime: `${TODAY}T07:22:00.000Z`, // 12:52 IST
};

function staffApi(extra: (url: string, init?: RequestInit) => { status: number; body?: unknown } | undefined = () => undefined, role: 'STAFF' | 'MANAGER' | 'ADMIN' = 'STAFF') {
  return mockApi((url, init) => {
    if (url.endsWith('/auth/me')) return { status: 200, body: userOf(role) };
    if (url.endsWith('/settings')) return settings;
    return extra(url, init) ?? (url.endsWith('/api/orders') ? { status: 200, body: queue } : undefined);
  });
}

describe('S7 queue (AC 06-2)', () => {
  it('EC-03-UI2 highlights the current slot as "Now serving" from server time', async () => {
    staffApi();
    renderRoute('/staff/queue');
    const slot = await screen.findByRole('region', { name: 'Slot 12:45–13:00' });
    expect(within(slot).getByText('Now serving')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Slot 12:30–12:45' })).queryByText('Now serving')).not.toBeInTheDocument();
  });

  it('EC-03-UI3 Issues shows only cancelled and no-show tickets, without buttons', async () => {
    staffApi();
    renderRoute('/staff/queue');
    await userEvent.click(await screen.findByRole('button', { name: /^Issues\s*2$/ }));
    const tickets = screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'));
    expect(tickets).toEqual(['Order BBBBBB', 'Order DDDDDD']);
    for (const t of screen.getAllByRole('article')) expect(within(t).queryByRole('button')).not.toBeInTheDocument();
  });

  it('EC-03-UI4 Start preparing sends PATCH PREPARING; a 409 shows a message', async () => {
    const fetchMock = staffApi((url, init) =>
      init?.method === 'PATCH' ? { status: 409, body: { error: { code: 'INVALID_TRANSITION', message: 'This order changed meanwhile. Refresh and try again.' } } } : undefined,
    );
    renderRoute('/staff/queue');
    await userEvent.click(within(await screen.findByRole('article', { name: 'Order CCCCCC' })).getByRole('button', { name: 'Start preparing' }));
    await waitFor(() => expect(calls(fetchMock, '/orders/3/status', 'PATCH')).toHaveLength(1));
    expect(JSON.parse(String(calls(fetchMock, '/orders/3/status', 'PATCH')[0]?.[1]?.body))).toEqual({ status: 'PREPARING' });
    expect(await screen.findByText('This order changed meanwhile. Refresh and try again.')).toBeInTheDocument();
  });
});

describe('S8 scan (AC 07-1)', () => {
  const placed = { order: order(9, 'K7Q4MZ', 'PLACED', '13:00'), warning: 'NOT_READY' };

  it('EC-03-UI5 without a camera the page falls back to the typed code', async () => {
    staffApi();
    renderRoute('/staff/scan');
    expect(await screen.findByText('Camera not available.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Pickup code')).toHaveFocus());
  });

  it('EC-03-UI6 a lower-case code is upper-cased; NOT_READY shows the warning and still allows hand-over', async () => {
    const fetchMock = staffApi((url, init) =>
      url.endsWith('/orders/verify') ? { status: 200, body: placed } : url.endsWith('/orders/9/collect') && init?.method === 'POST' ? { status: 200, body: { ...placed.order, status: 'COLLECTED' } } : undefined,
    );
    renderRoute('/staff/scan');
    await userEvent.type(await screen.findByLabelText('Pickup code'), 'k7q4mz');
    await userEvent.click(screen.getByRole('button', { name: 'Find' }));
    expect(await screen.findByText('Not marked ready yet.')).toBeInTheDocument();
    expect(JSON.parse(String(calls(fetchMock, '/orders/verify', 'POST')[0]?.[1]?.body))).toEqual({ pickupCode: 'K7Q4MZ' });
    await userEvent.click(screen.getByRole('button', { name: 'HAND OVER' }));
    expect(await screen.findByText('Handed over')).toBeInTheDocument();
  });

  it('EC-03-UI7 after "Handed over" the screen resets for the next person after 3 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      staffApi((url) => (url.endsWith('/orders/verify') ? { status: 200, body: { ...placed, warning: null } } : url.endsWith('/collect') ? { status: 200, body: { ...placed.order, status: 'COLLECTED' } } : undefined));
      renderRoute('/staff/scan');
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await user.type(await screen.findByLabelText('Pickup code'), 'K7Q4MZ');
      await user.click(screen.getByRole('button', { name: 'Find' }));
      await user.click(await screen.findByRole('button', { name: 'HAND OVER' }));
      expect(await screen.findByText('Handed over')).toBeInTheDocument();
      await act(async () => {
        vi.advanceTimersByTime(3100);
      });
      expect(screen.queryByText('Handed over')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Pickup code')).toHaveValue('');
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['ALREADY_COLLECTED', 409, 'Already collected at 13:04'],
    ['WRONG_DATE', 409, 'This order is for 18 Nov, not today'],
    ['INVALID_STATUS', 409, 'This order was cancelled'],
    ['NOT_FOUND', 404, 'Code not found'],
  ])('EC-03-UI8 %s is shown big and red', async (code, status, message) => {
    staffApi((url) => (url.endsWith('/orders/verify') ? { status, body: { error: { code, message } } } : undefined));
    renderRoute('/staff/scan');
    await userEvent.type(await screen.findByLabelText('Pickup code'), 'ZZZZZZ');
    await userEvent.click(screen.getByRole('button', { name: 'Find' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByRole('button', { name: 'HAND OVER' })).not.toBeInTheDocument();
  });
});

describe('S9 prep list (AC 13-1)', () => {
  it('EC-03-UI9 shows totals, sold-out tiles and prints', async () => {
    const print = vi.fn();
    vi.stubGlobal('print', print);
    staffApi((url) =>
      url.includes('/reports/prep-list')
        ? { status: 200, body: [{ name: 'Veg Biryani', diet: 'VEG', category: 'MAIN', qty: 68, quantity: 80, soldOut: false }, { name: 'Chicken Curry', diet: 'NON_VEG', category: 'MAIN', qty: 30, quantity: 30, soldOut: true }] }
        : undefined,
    );
    renderRoute('/staff/prep');
    expect(await screen.findByText((_, el) => el?.tagName === 'P' && /^Total\s*98\s*portions$/.test(el.textContent ?? ''))).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Chicken Curry' })).getByText('Sold out')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Veg Biryani' })).getByText('12 unsold')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Print' }));
    expect(print).toHaveBeenCalled();
  });
});

describe('S10 dashboard (AC 09-1)', () => {
  const dash = (extra: Record<string, unknown> = {}) => ({
    date: TODAY,
    kpis: { orders: 0, revenuePaise: 0, avgOrderPaise: 0, collected: 0, collectedPct: 0, pending: 0, cancelled: 0, noShow: 0, vsYesterdayPct: null },
    items: [], slots: [{ start: '12:30', count: 0 }], capacityPerSlot: 30, peakSlot: null, lastUpdated: `${TODAY}T07:22:00.000Z`, ...extra,
  });

  it('manager dashboard has no prep link, and the staff queue, scan and prep pages are not authorised', async () => {
    staffApi((url) => (url.includes('/reports/dashboard') ? { status: 200, body: dash() } : undefined), 'MANAGER');
    const { unmount } = renderRoute('/manager/dashboard');
    expect(await screen.findByText('No orders for this date')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /View prep list/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Orders Queue & Prep' })).not.toBeInTheDocument();
    unmount();
    for (const path of ['/staff/queue', '/staff/scan', '/staff/prep']) {
      const view = renderRoute(path);
      expect(await screen.findByRole('heading', { name: 'Not authorised' })).toBeInTheDocument();
      view.unmount();
    }
  });

  it('EC-03-UI10 admin sees the dashboard read-only, without the staff prep link', async () => {
    staffApi((url) => (url.includes('/reports/dashboard') ? { status: 200, body: dash() } : undefined), 'ADMIN');
    renderRoute('/manager/dashboard');
    expect(await screen.findByText('Read-only')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /View prep list/ })).not.toBeInTheDocument();
    expect(await screen.findByText('No orders for this date')).toBeInTheDocument();
    expect(screen.getByText('No orders on the previous day')).toBeInTheDocument();
  });

  it('EC-03-UI11 picking a date asks the API for that date', async () => {
    const fetchMock = staffApi((url) => (url.includes('/reports/dashboard') ? { status: 200, body: dash() } : undefined), 'MANAGER');
    renderRoute('/manager/dashboard');
    const input = await screen.findByLabelText('Date');
    fireEvent.change(input, { target: { value: '2030-05-14' } });
    await waitFor(() => expect(calls(fetchMock, '/reports/dashboard?date=2030-05-14').length).toBeGreaterThan(0));
  });
});
