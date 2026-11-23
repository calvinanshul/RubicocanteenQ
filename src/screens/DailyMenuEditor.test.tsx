import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, todayIST } from '../lib/format';
import { calls, mockApi, renderRoute, userOf } from '../test/utils';
import { validateRows } from './DailyMenuEditor';

const dishes = [
  { id: 1, name: 'Veg Biryani', description: null, category: 'MAIN', pricePaise: 12000, diet: 'VEG', isActive: true },
  { id: 2, name: 'Chicken Curry', description: null, category: 'MAIN', pricePaise: 15000, diet: 'NON_VEG', isActive: true },
  { id: 3, name: 'Curd Rice', description: null, category: 'LIGHT', pricePaise: 6000, diet: 'VEG', isActive: true },
];
const date = addDays(todayIST(), 2);
const menu = {
  date,
  orderingOpen: true,
  cutoff: '11:00',
  closed: false,
  pickupLocation: 'Building 4 · Counter A',
  items: [
    { dailyMenuItemId: 11, menuItemId: 1, name: 'Veg Biryani', description: null, pricePaise: 12000, diet: 'VEG', category: 'MAIN', quantity: 80, ordered: 0, remaining: 80 },
    { dailyMenuItemId: 12, menuItemId: 2, name: 'Chicken Curry', description: null, pricePaise: 15000, diet: 'NON_VEG', category: 'MAIN', quantity: 30, ordered: 25, remaining: 5 },
  ],
};

function api(put?: { status: number; body?: unknown }) {
  return mockApi((url, init) => {
    if (url.endsWith('/auth/me')) return { status: 200, body: userOf('MANAGER') };
    if (url.endsWith('/settings')) return { status: 200, body: { pickupLocation: 'Building 4 · Counter A', orderCutoff: '11:00' } };
    if (url.includes('/menu-items')) return { status: 200, body: dishes };
    if (url.includes(`/daily-menu/${date}`) && init?.method === 'PUT') return put ?? { status: 200, body: menu };
    if (url.includes(`/daily-menu?date=${date}`)) return { status: 200, body: menu };
    return undefined;
  });
}

describe('S13 Daily menu editor', () => {
  it('loads dishes with on-menu state and already-ordered counts', async () => {
    api();
    renderRoute(`/manager/daily-menu?date=${date}`);
    const qty = await screen.findByLabelText('Portions for Chicken Curry');
    expect(qty).toHaveValue(30);
    expect(screen.getByRole('switch', { name: 'On menu: Curd Rice' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByLabelText('Portions for Curd Rice')).toBeDisabled();
    expect(within(screen.getByTestId('daily-row-2')).getByText('25')).toBeInTheDocument();
  });

  it('blocks a quantity below what is already ordered without calling the API (US-07 AC2)', async () => {
    const fetchMock = api();
    renderRoute(`/manager/daily-menu?date=${date}`);
    const qty = await screen.findByLabelText('Portions for Chicken Curry');
    await userEvent.clear(qty);
    await userEvent.type(qty, '20');
    await userEvent.click(screen.getByRole('button', { name: 'Save menu' }));
    expect(await screen.findByText("Can't be lower than already ordered (25)")).toBeInTheDocument();
    expect(screen.getByText('1 problem to fix before saving')).toBeInTheDocument();
    expect(calls(fetchMock, '/daily-menu/', 'PUT')).toHaveLength(0);
  });

  it('saves the switched-on dishes', async () => {
    const fetchMock = api();
    renderRoute(`/manager/daily-menu?date=${date}`);
    await screen.findByLabelText('Portions for Chicken Curry');
    await userEvent.click(screen.getByRole('switch', { name: 'On menu: Curd Rice' }));
    await userEvent.type(screen.getByLabelText('Portions for Curd Rice'), '40');
    await userEvent.click(screen.getByRole('button', { name: 'Save menu' }));
    await waitFor(() => expect(calls(fetchMock, '/daily-menu/', 'PUT')).toHaveLength(1));
    const [, init] = calls(fetchMock, '/daily-menu/', 'PUT')[0] ?? [];
    expect(JSON.parse(String(init?.body))).toEqual({
      entries: [
        { menuItemId: 1, quantity: 80 },
        { menuItemId: 2, quantity: 30 },
        { menuItemId: 3, quantity: 40 },
      ],
    });
    expect(await screen.findByText(/Menu saved/)).toBeInTheDocument();
  });

  it('shows the server error on the matching row', async () => {
    api({ status: 409, body: { error: { code: 'QTY_BELOW_ORDERED', message: "Quantity can't be lower than already ordered (31)", fields: { 'entries.1.quantity': "Quantity can't be lower than already ordered (31)" } } } });
    renderRoute(`/manager/daily-menu?date=${date}`);
    await screen.findByLabelText('Portions for Chicken Curry');
    await userEvent.click(screen.getByRole('button', { name: 'Save menu' }));
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((a) => a.textContent?.includes("Quantity can't be lower than already ordered (31)"))).toBe(true);
    expect(within(screen.getByTestId('daily-row-2')).getByText("Quantity can't be lower than already ordered (31)")).toBeInTheDocument();
  });

  it('makes past dates read-only', async () => {
    api();
    renderRoute(`/manager/daily-menu?date=${addDays(todayIST(), -1)}`);
    expect(await screen.findByText('This date is in the past.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save menu' })).toBeDisabled();
  });
});

describe('validateRows', () => {
  const rows = [
    { item: { id: 1, name: 'A', category: 'MAIN' as const, diet: 'VEG' as const, pricePaise: 100 }, ordered: 5 },
    { item: { id: 2, name: 'B', category: 'MAIN' as const, diet: 'VEG' as const, pricePaise: 100 }, ordered: 0 },
  ];
  it.each([
    ['0', 'Quantity must be a whole number from 1 to 1000'],
    ['1.5', 'Quantity must be a whole number from 1 to 1000'],
    ['1001', 'Quantity must be a whole number from 1 to 1000'],
    ['', 'Quantity must be a whole number from 1 to 1000'],
    ['4', "Can't be lower than already ordered (5)"],
  ])('qty %s → error', (qty, message) => {
    expect(validateRows(rows, { 1: { on: true, qty }, 2: { on: false, qty: '' } })[1]).toBe(message);
  });
  it('refuses to take a dish with orders off the menu', () => {
    expect(validateRows(rows, { 1: { on: false, qty: '5' }, 2: { on: false, qty: '' } })[1]).toMatch(/can't be taken off/);
  });
  it('accepts valid rows', () => {
    expect(validateRows(rows, { 1: { on: true, qty: '5' }, 2: { on: true, qty: '1000' } })).toEqual({});
  });
});
