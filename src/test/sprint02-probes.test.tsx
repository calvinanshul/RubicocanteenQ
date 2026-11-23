/** Sprint 02 cycle 1 tester probes for S3, S4 and S5 (React Testing Library). */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, todayIST } from '../lib/format';
import { calls, mockApi, renderRoute, userOf } from './utils';

const TODAY = todayIST();

beforeEach(() => sessionStorage.clear());
const settings = { status: 200, body: { pickupLocation: 'Building 4 · Counter A', orderCutoff: '11:00', slotStart: '12:30', slotEnd: '14:30', slotMinutes: 15, maxQtyPerItem: 5, noShowGraceMinutes: 30, slotCapacity: 30, closedWeekdays: [] } };
const noOrders = { status: 200, body: { items: [], page: 1, pageSize: 10, total: 0 } };

function item(id: number, name: string, extra: Record<string, unknown> = {}) {
  return { dailyMenuItemId: id, menuItemId: id, name, description: null, pricePaise: 12000, diet: 'VEG', category: 'MAIN', quantity: 50, ordered: 0, remaining: 50, ...extra };
}
function menu(date: string, items: unknown[], extra: Record<string, unknown> = {}) {
  return { date, serverTime: `${date}T04:00:00.000Z`, orderingOpen: true, cutoff: '11:00', closed: false, pickupLocation: 'Building 4 · Counter A', items, ...extra };
}

function api(routes: { menu?: unknown; menuStatus?: number; orders?: unknown; slots?: unknown; post?: { status: number; body: unknown }; order?: unknown }) {
  return mockApi((url, init) => {
    if (url.endsWith('/auth/me')) return { status: 200, body: userOf('EMPLOYEE') };
    if (url.endsWith('/settings')) return settings;
    if (url.includes('/daily-menu?date=')) return routes.menuStatus ? { status: routes.menuStatus, body: { error: { code: 'MENU_NOT_PUBLISHED', message: 'Not published' } } } : { status: 200, body: routes.menu };
    if (url.includes('/orders/me')) return routes.orders ? { status: 200, body: routes.orders } : noOrders;
    if (url.includes('/slots?date=')) return { status: 200, body: routes.slots };
    if (url.endsWith('/orders') && init?.method === 'POST') return routes.post;
    if (/\/orders\/\d+$/.test(url)) return routes.order ? { status: 200, body: routes.order } : { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Order not found' } } };
    return undefined;
  });
}

describe('S3 menu (AC 03-2, 03-3, 03-4)', () => {
  const items = [
    item(1, 'Veg Biryani'),
    item(2, 'Chicken Curry', { diet: 'NON_VEG' }),
    item(3, 'Dal Tadka + Rice', { category: 'COMBO', remaining: 3 }),
    item(4, 'Paneer Butter Masala', { remaining: 0, ordered: 50 }),
  ];

  it('EC-02-UI4 filter chips show counts and filter the cards', async () => {
    api({ menu: menu(TODAY, items) });
    renderRoute('/menu');
    const chips = await screen.findByRole('group', { name: 'Filter dishes' });
    expect(within(chips).getByRole('button', { name: /^All\s*4$/ })).toBeInTheDocument();
    expect(within(chips).getByRole('button', { name: /^Veg\s*3$/ })).toBeInTheDocument();
    expect(within(chips).getByRole('button', { name: /^Non-veg\s*1$/ })).toBeInTheDocument();
    await userEvent.click(within(chips).getByRole('button', { name: /^Non-veg/ }));
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual(['Chicken Curry']);
  });

  it('EC-02-UI5 countdown uses server time and turns red under 10 minutes', async () => {
    // Server says 10:55 IST, whatever the device clock says
    api({ menu: menu(TODAY, items, { serverTime: `${TODAY}T05:25:00.000Z` }) });
    renderRoute('/menu');
    const pill = await screen.findByText('5 min left');
    expect(pill.className).toMatch(/error/);
  });

  it('EC-02-UI6 the stepper is capped by what is left and by max 5', async () => {
    api({ menu: menu(TODAY, items) });
    renderRoute('/menu');
    const dal = await screen.findByRole('article', { name: 'Dal Tadka + Rice' });
    await userEvent.click(within(dal).getByRole('button', { name: 'Add' }));
    await userEvent.click(within(dal).getByRole('button', { name: 'Increase Dal Tadka + Rice' }));
    await userEvent.click(within(dal).getByRole('button', { name: 'Increase Dal Tadka + Rice' }));
    expect(within(dal).getByLabelText('Quantity of Dal Tadka + Rice')).toHaveTextContent('3');
    expect(within(dal).getByRole('button', { name: 'Increase Dal Tadka + Rice' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /3 items .* Checkout/ })).toBeInTheDocument();
  });

  it('EC-02-UI7 not published, closed and error states', async () => {
    api({ menuStatus: 422 });
    const r1 = renderRoute('/menu');
    expect(await screen.findByText(/menu isn't published yet/)).toBeInTheDocument();
    r1.unmount();

    api({ menu: menu(TODAY, [], { closed: true, orderingOpen: false }) });
    const r2 = renderRoute('/menu');
    expect(await screen.findByText('The canteen is closed on this day')).toBeInTheDocument();
    r2.unmount();

    mockApi((url) => (url.endsWith('/auth/me') ? { status: 200, body: userOf('EMPLOYEE') } : url.endsWith('/settings') ? settings : url.includes('/daily-menu') ? { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'x' } } } : noOrders));
    renderRoute('/menu');
    expect(await screen.findByText("We couldn't load the menu.", {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it('EC-02-UI8 after the cut-off: banner, Add disabled, and a jump to tomorrow', async () => {
    api({ menu: menu(TODAY, items, { orderingOpen: false, serverTime: `${TODAY}T05:35:00.000Z` }) });
    renderRoute('/menu');
    expect(await screen.findByText('Ordering for today closed at 11:00')).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Veg Biryani' })).getByRole('button', { name: 'Add' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Order for tomorrow' }));
    expect(screen.getByRole('tab', { name: 'Tomorrow' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('S4 checkout (AC 04-4)', () => {
  const slots = [
    { start: '12:30', end: '12:45', booked: 30, capacity: 30, available: false },
    { start: '13:00', end: '13:15', booked: 3, capacity: 30, available: true },
  ];

  async function goToCheckout(post: { status: number; body: unknown }) {
    const fetchMock = api({ menu: menu(TODAY, [item(1, 'Veg Biryani')]), slots, post });
    renderRoute('/menu');
    await userEvent.click(within(await screen.findByRole('article', { name: 'Veg Biryani' })).getByRole('button', { name: 'Add' }));
    await userEvent.click(screen.getByRole('button', { name: /Checkout/ }));
    await screen.findByRole('heading', { name: 'Checkout' });
    return fetchMock;
  }

  it('EC-02-UI9 a full slot is disabled and the button waits for a slot', async () => {
    await goToCheckout({ status: 201, body: {} });
    expect(screen.getByRole('radio', { name: /^12:30–12:45 · Full · 30\/30/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Place order/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: /^13:00/ }));
    expect(screen.getByRole('button', { name: 'Place order · ₹120 · Slot 13:00' })).toBeEnabled();
  });

  it.each([
    ['OUT_OF_STOCK', 'Only 1 Veg Biryani left', /Only 1 Veg Biryani left\. Reduce the quantity/],
    ['CUTOFF_PASSED', 'Ordering for today closed at 11:00', /closed at 11:00\. Try ordering for tomorrow/],
    ['SLOT_FULL', 'This slot just filled up. Pick another.', /This slot just filled up\. Pick another\./],
  ])('EC-02-UI10 %s is shown inline with what to do next', async (code, message, shown) => {
    const fetchMock = await goToCheckout({ status: 409, body: { error: { code, message } } });
    await userEvent.click(screen.getByRole('radio', { name: /^13:00/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Place order/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(shown);
    const [, init] = calls(fetchMock, '/orders', 'POST')[0] ?? [];
    expect(new Headers(init?.headers).get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('EC-02-UI11 an empty cart shows a way back to the menu', async () => {
    api({ menu: menu(TODAY, [item(1, 'Veg Biryani')]), slots });
    renderRoute(`/menu/checkout?date=${TODAY}`);
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument();
  });
});

describe('S5 pass (AC 05-1)', () => {
  const base = {
    id: 501, status: 'PLACED', date: TODAY, slotStart: '13:00', slotEnd: '13:15', pickupLocation: 'Building 4 · Counter A',
    createdAt: `${TODAY}T04:48:00.000Z`, pickupCode: 'K7Q4MZ', totalPaise: 12000, items: [{ name: 'Veg Biryani', qty: 1, unitPricePaise: 12000 }],
    cancellable: true, cutoff: '11:00', readyAt: null, collectedAt: null, cancelledAt: null, serverTime: `${TODAY}T05:00:00.000Z`,
  };

  it('EC-02-UI12 READY shows the green "ready" message and the code; copy works', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    api({ order: { ...base, status: 'READY', cancellable: false } });
    renderRoute('/orders/501');
    expect(await screen.findByText('Your lunch is ready!')).toBeInTheDocument();
    expect(screen.getByTestId('pickup-code')).toHaveTextContent('K7Q4MZ');
    expect(screen.getByRole('img', { name: 'Pickup QR code' })).toHaveAttribute('src', '/api/orders/501/qr');
    await userEvent.click(screen.getByRole('button', { name: 'Copy pickup code' }));
    expect(writeText).toHaveBeenCalledWith('K7Q4MZ');
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument();
    expect(screen.getByText(/can no longer be changed or cancelled/)).toBeInTheDocument();
  });

  it('EC-02-UI13 a cancelled order hides the QR and code', async () => {
    api({ order: { ...base, status: 'CANCELLED', cancellable: false } });
    renderRoute('/orders/501');
    expect(await screen.findByText(/This order was cancelled/)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Pickup QR code' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('pickup-code')).not.toBeInTheDocument();
  });

  it("EC-02-UI14 someone else's or a missing order shows Order not found", async () => {
    api({});
    renderRoute('/orders/999');
    expect(await screen.findByText('Order not found')).toBeInTheDocument();
  });

  it('EC-02-UI15 the pickup window shows "In N mins" from server time', async () => {
    api({ order: base }); // server 10:30 IST, slot 13:00
    renderRoute('/orders/501');
    expect(await screen.findByText('In 2 h 30 mins')).toBeInTheDocument();
  });
});

describe('S3 already ordered (AC 03-4)', () => {
  it('EC-02-UI16 an active order for the day shows a View link and disables Add', async () => {
    const tomorrow = addDays(TODAY, 1);
    api({
      menu: menu(tomorrow, [item(1, 'Veg Biryani')]),
      orders: { items: [{ id: 77, status: 'PLACED', date: tomorrow }], page: 1, pageSize: 10, total: 1 },
    });
    renderRoute('/menu?day=tomorrow');
    expect(await screen.findByText('You already have an order in progress for tomorrow.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View/ })).toHaveAttribute('href', '/orders/77');
    await waitFor(() => expect(within(screen.getByRole('article', { name: 'Veg Biryani' })).getByRole('button', { name: 'Add' })).toBeDisabled());
  });

  it('EC-02-UI16b a collected order does not block ordering again', async () => {
    const tomorrow = addDays(TODAY, 1);
    api({
      menu: menu(tomorrow, [item(1, 'Veg Biryani')]),
      orders: { items: [{ id: 78, status: 'COLLECTED', date: tomorrow }], page: 1, pageSize: 10, total: 1 },
    });
    renderRoute('/menu?day=tomorrow');
    await waitFor(() => expect(within(screen.getByRole('article', { name: 'Veg Biryani' })).getByRole('button', { name: 'Add' })).toBeEnabled());
    expect(screen.queryByText(/You already have an order/)).not.toBeInTheDocument();
  });
});

describe('cart and logout', () => {
  it("EC-02-UI17 logging out clears the cart, so the next person on this browser doesn't inherit it", async () => {
    api({ menu: menu(TODAY, [item(1, 'Veg Biryani')]) });
    renderRoute('/menu');
    await userEvent.click(within(await screen.findByRole('article', { name: 'Veg Biryani' })).getByRole('button', { name: 'Add' }));
    expect(sessionStorage.getItem('cq_cart')).toContain('"1":1');
    await userEvent.click(screen.getAllByRole('button', { name: 'Log out' })[0] as HTMLElement);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument());
    expect(sessionStorage.getItem('cq_cart') ?? '{}').not.toContain('"1":1');
  });
});

describe('cycle 2: cart ownership (BUG-02-001)', () => {
  it("EC-02-UI18 a cart left by another user (expired session, no logout) is not shown", async () => {
    sessionStorage.setItem('cq_cart', JSON.stringify({ userId: 999, carts: { [TODAY]: { 1: 2 } } }));
    api({ menu: menu(TODAY, [item(1, 'Veg Biryani')]) }); // logged in as user id 1
    renderRoute('/menu');
    const card = await screen.findByRole('article', { name: 'Veg Biryani' });
    expect(within(card).getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Checkout/ })).not.toBeInTheDocument();
  });

  it('EC-02-UI19 the same user keeps their cart across a reload', async () => {
    sessionStorage.setItem('cq_cart', JSON.stringify({ userId: 1, carts: { [TODAY]: { 1: 2 } } }));
    api({ menu: menu(TODAY, [item(1, 'Veg Biryani')]) });
    renderRoute('/menu');
    const card = await screen.findByRole('article', { name: 'Veg Biryani' });
    await waitFor(() => expect(within(card).getByLabelText('Quantity of Veg Biryani')).toHaveTextContent('2'));
  });
});
