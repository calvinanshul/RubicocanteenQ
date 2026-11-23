import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderRoute, userOf } from '../test/utils';

const dish = { id: 7, name: 'Veg Biryani', description: 'Basmati, raita', category: 'MAIN', pricePaise: 12000, diet: 'VEG', isActive: true };
const archived = { id: 8, name: 'Old Soup', description: null, category: 'SIDE', pricePaise: 5000, diet: 'VEG', isActive: false };
const settings = { orderCutoff: '11:00', slotStart: '12:30', slotEnd: '14:30', slotMinutes: 15, slotCapacity: 30, pickupLocation: 'Counter A', noShowGraceMinutes: 30, maxQtyPerItem: 5, closedWeekdays: [0, 6], allowedDomains: ['rubicotech.com'] };

function bodyOf(fn: ReturnType<typeof mockApi>, path: string, method: string): unknown {
  const call = calls(fn, path, method).at(-1);
  return call?.[1]?.body ? JSON.parse(String(call[1].body)) : undefined;
}

describe('S11/S12 Menu catalogue', () => {
  function api(post?: { status: number; body?: unknown }) {
    return mockApi((url, init) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('MANAGER') };
      if (url.endsWith('/settings')) return { status: 200, body: settings };
      if (url.includes('/menu-items') && init?.method === 'POST') return post ?? { status: 201, body: { ...dish, id: 9, name: 'Paneer Butter Masala' } };
      if (url.includes('/menu-items')) return { status: 200, body: [dish, archived] };
      return undefined;
    });
  }

  it('hides archived dishes until "Show archived" is ticked', async () => {
    api();
    renderRoute('/manager/menu-items');
    expect(await screen.findByText('Veg Biryani')).toBeInTheDocument();
    expect(screen.getByText('1 active dish · 1 archived')).toBeInTheDocument();
    expect(screen.queryByText('Old Soup')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Show archived'));
    expect(screen.getByText('Old Soup')).toBeInTheDocument();
  });

  it.each(['0', '-5', 'abc', '10.999', '1001'])('refuses price %j on the client (US-06 AC2)', async (price) => {
    const fn = api();
    renderRoute('/manager/menu-items');
    await userEvent.click(await screen.findByRole('button', { name: 'Add item' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Dish name'), 'Paneer Butter Masala');
    await userEvent.type(within(dialog).getByLabelText('Price (₹)'), price);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByText(/Price must be between ₹1 and ₹1,000/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Price (₹)')).toHaveAttribute('aria-invalid', 'true');
    expect(calls(fn, '/menu-items', 'POST')).toHaveLength(0);
  });

  it('sends the price in paise (₹120.50 → 12050)', async () => {
    const fn = api();
    renderRoute('/manager/menu-items');
    await userEvent.click(await screen.findByRole('button', { name: 'Add item' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Dish name'), 'Paneer Butter Masala');
    await userEvent.type(within(dialog).getByLabelText('Price (₹)'), '120.50');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Non-veg' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(bodyOf(fn, '/menu-items', 'POST')).toMatchObject({ name: 'Paneer Butter Masala', pricePaise: 12050, diet: 'NON_VEG', category: 'MAIN' });
  });

  it('shows the duplicate-name error from the API on the name field (US-06 AC4)', async () => {
    api({ status: 409, body: { error: { code: 'DUPLICATE_NAME', message: 'An item with this name already exists', fields: { name: 'An item with this name already exists' } } } });
    renderRoute('/manager/menu-items');
    await userEvent.click(await screen.findByRole('button', { name: 'Add item' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Dish name'), 'veg biryani');
    await userEvent.type(within(dialog).getByLabelText('Price (₹)'), '120');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('An item with this name already exists')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Dish name')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('S14 Users & roles', () => {
  const ramesh = { id: 5, name: 'Ramesh Iyer', email: 'ramesh@rubicotech.com', role: 'EMPLOYEE', isActive: true, employeeCode: null, department: null, createdAt: '2026-11-02T05:00:00.000Z' };
  const page = { items: [ramesh], page: 1, pageSize: 20, total: 1, roleCounts: { ALL: 1, EMPLOYEE: 1, STAFF: 0, MANAGER: 0, ADMIN: 0 } };

  function api(patch: { status: number; body?: unknown }) {
    return mockApi((url, init) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('ADMIN') };
      if (url.endsWith('/settings')) return { status: 200, body: settings };
      if (url.includes('/users/5') && init?.method === 'PATCH') return patch;
      if (url.includes('/users?')) return { status: 200, body: page };
      return undefined;
    });
  }

  it('asks before changing a role and sends nothing on Cancel', async () => {
    const fn = api({ status: 200, body: { ...ramesh, role: 'MANAGER' } });
    renderRoute('/admin/users');
    await userEvent.selectOptions(await screen.findByLabelText('Role for Ramesh Iyer'), 'MANAGER');
    expect(screen.getByRole('dialog', { name: 'Change role?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(calls(fn, '/users/5', 'PATCH')).toHaveLength(0);
    expect(screen.getByLabelText('Role for Ramesh Iyer')).toHaveValue('EMPLOYEE');
  });

  it('confirms a role change and shows "Role updated" (US-04 AC2)', async () => {
    const fn = api({ status: 200, body: { ...ramesh, role: 'MANAGER' } });
    renderRoute('/admin/users');
    await userEvent.selectOptions(await screen.findByLabelText('Role for Ramesh Iyer'), 'MANAGER');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('Role updated. Ramesh Iyer is now Manager.')).toBeInTheDocument();
    expect(bodyOf(fn, '/users/5', 'PATCH')).toEqual({ role: 'MANAGER' });
  });

  it('rows from the previous search cannot be changed while a new search loads', async () => {
    const other = { ...ramesh, id: 6, name: 'Ramesh Iyer', email: 'ramesh.two@rubicotech.com' };
    mockApi((url) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('ADMIN') };
      if (url.endsWith('/settings')) return { status: 200, body: settings };
      if (url.includes('q=ramesh.two')) return { status: 200, body: { ...page, items: [other] } };
      if (url.includes('/users?')) return { status: 200, body: page };
      return undefined;
    });
    renderRoute('/admin/users');
    expect(await screen.findByLabelText('Role for Ramesh Iyer')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Search users'), 'ramesh.two');
    expect(screen.queryByLabelText('Role for Ramesh Iyer')).not.toBeInTheDocument();
    expect(await screen.findByText('ramesh.two@rubicotech.com')).toBeInTheDocument();
    expect(screen.queryByText('ramesh@rubicotech.com')).not.toBeInTheDocument();
  });

  it('shows the last-admin message (US-04 AC4)', async () => {
    api({ status: 409, body: { error: { code: 'LAST_ADMIN', message: 'At least one active admin is required.' } } });
    renderRoute('/admin/users');
    await userEvent.click(await screen.findByRole('switch', { name: 'Active: Ramesh Iyer' }));
    expect(screen.getByRole('dialog', { name: 'Disable account?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('At least one active admin is required.');
  });
});

describe('S15 Settings', () => {
  function api() {
    return mockApi((url, init) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('ADMIN') };
      if (url.endsWith('/settings') && init?.method === 'PUT') return { status: 200, body: JSON.parse(String(init.body)) as object };
      if (url.endsWith('/settings')) return { status: 200, body: settings };
      if (url.includes('/closed-dates')) return { status: 200, body: [{ date: '2030-11-25', reason: 'Holiday' }] };
      return undefined;
    });
  }

  it('shows the cross-field errors and does not save (US-05 AC2/AC3)', async () => {
    const fn = api();
    renderRoute('/admin/settings');
    const end = await screen.findByLabelText('Pickup window end');
    await userEvent.clear(end);
    await userEvent.type(end, '12:00');
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(screen.getByText('Pickup window end must be after start')).toBeInTheDocument();
    expect(screen.getByText(/1 field needs fixing/)).toBeInTheDocument();
    expect(calls(fn, '/settings', 'PUT')).toHaveLength(0);
  });

  it('saves the full settings object with a new domain', async () => {
    const fn = api();
    renderRoute('/admin/settings');
    await userEvent.type(await screen.findByLabelText('Add a domain'), '@RubicoTech.in');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await userEvent.click(screen.getByLabelText('Saturday'));
    expect(screen.getByText('2 unsaved changes')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(calls(fn, '/settings', 'PUT')).toHaveLength(1));
    expect(bodyOf(fn, '/settings', 'PUT')).toMatchObject({ allowedDomains: ['rubicotech.com', 'rubicotech.in'], closedWeekdays: [0], slotCapacity: 30 });
    expect(await screen.findByText('No unsaved changes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove holiday Mon 25 Nov 2030' })).toBeInTheDocument();
  });
});

describe('S6 My orders', () => {
  const order = (id: number, date: string, status: string) => ({
    id, status, date, slotStart: '13:00', slotEnd: '13:15', pickupLocation: 'Counter A', createdAt: `${date}T04:00:00Z`, pickupCode: 'K7Q4MZ',
    totalPaise: 12000, items: [{ name: 'Veg Biryani', qty: 1, unitPricePaise: 12000 }], cancellable: false, cutoff: '11:00', readyAt: null,
    collectedAt: status === 'COLLECTED' ? `${date}T07:34:00Z` : null, cancelledAt: null, serverTime: '2030-11-20T05:00:00.000Z',
  });

  it('shows the active order, the month summary and loads more', async () => {
    const first = Array.from({ length: 10 }, (_, i) => order(100 - i, `2030-11-${String(20 - i).padStart(2, '0')}`, i === 0 ? 'READY' : 'COLLECTED'));
    const fn = mockApi((url) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('EMPLOYEE') };
      if (url.endsWith('/settings')) return { status: 200, body: settings };
      const summary = { month: '2030-11', orders: 11, totalPaise: 132000 };
      if (url.includes('/orders/me?page=1')) return { status: 200, body: { items: first, page: 1, pageSize: 10, total: 11, summary } };
      if (url.includes('/orders/me?page=2')) return { status: 200, body: { items: [order(50, '2030-10-30', 'NO_SHOW')], page: 2, pageSize: 10, total: 11, summary } };
      return undefined;
    });
    renderRoute('/orders');
    expect(await screen.findByRole('link', { name: /Active order K7Q4MZ/ })).toHaveAttribute('href', '/orders/100');
    expect(screen.getByText('Orders in Nov')).toBeInTheDocument();
    expect(screen.getByText('₹1,320')).toBeInTheDocument();
    expect(screen.getByText('Showing 10 of 11')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByText('Showing 11 of 11')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
    expect(calls(fn, '/orders/me?page=2')).toHaveLength(1);
  });
});
