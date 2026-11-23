/**
 * Sprint 04 cycle-1 UI probes (EC-04-UI4 … EC-04-UI8).
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { calls, mockApi, renderRoute, userOf } from './utils';

const settings = { orderCutoff: '11:00', slotStart: '12:30', slotEnd: '14:30', slotMinutes: 15, slotCapacity: 30, pickupLocation: 'Counter A', noShowGraceMinutes: 30, maxQtyPerItem: 5, closedWeekdays: [0, 6], allowedDomains: ['rubicotech.com'] };
const duplicate = { status: 409, body: { error: { code: 'DUPLICATE_NAME', message: 'An item with this name already exists', fields: { name: 'An item with this name already exists' } } } };

describe('Sprint 04 UI probes', () => {
  it('EC-04-UI4 restoring an archived dish whose name is taken tells the manager why', async () => {
    const archived = { id: 8, name: 'Veg Biryani', description: null, category: 'MAIN', pricePaise: 12000, diet: 'VEG', isActive: false };
    mockApi((url, init) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('MANAGER') };
      if (url.endsWith('/settings')) return { status: 200, body: settings };
      if (url.includes('/menu-items/8') && init?.method === 'PATCH') return duplicate;
      if (url.includes('/menu-items')) return { status: 200, body: [archived] };
      return undefined;
    });
    renderRoute('/manager/menu-items');
    await userEvent.click(await screen.findByLabelText('Show archived'));
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Restore item' }));
    expect(await within(dialog).findByText('An item with this name already exists')).toBeInTheDocument();
  });

  it('EC-04-UI5 a very long search (101+ characters) does not break the users page', async () => {
    mockApi((url) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('ADMIN') };
      if (url.endsWith('/settings')) return { status: 200, body: settings };
      if (url.includes('/users?')) {
        const q = new URL(url, 'http://x').searchParams.get('q') ?? '';
        if (q.length > 100) return { status: 400, body: { error: { code: 'VALIDATION_ERROR', message: 'Please fix the highlighted fields', fields: { q: 'String must contain at most 100 character(s)' } } } };
        return { status: 200, body: { items: [], page: 1, pageSize: 20, total: 0, roleCounts: { ALL: 0, EMPLOYEE: 0, STAFF: 0, MANAGER: 0, ADMIN: 0 } } };
      }
      return undefined;
    });
    renderRoute('/admin/users');
    const input = await screen.findByLabelText('Search users');
    await userEvent.click(input);
    await userEvent.paste('x'.repeat(150));
    await waitFor(() => expect(screen.getByText('No users match')).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.queryByText("We couldn't load the users.")).not.toBeInTheDocument();
  });

  it('EC-04-UI6 a failed settings save keeps the edits and shows the reason', async () => {
    mockApi((url, init) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('ADMIN') };
      if (url.endsWith('/settings') && init?.method === 'PUT') return { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } } };
      if (url.endsWith('/settings')) return { status: 200, body: settings };
      if (url.includes('/closed-dates')) return { status: 200, body: [] };
      return undefined;
    });
    renderRoute('/admin/settings');
    const loc = await screen.findByLabelText('Pickup location');
    await userEvent.clear(loc);
    await userEvent.type(loc, 'Building 9');
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.getByLabelText('Pickup location')).toHaveValue('Building 9');
    expect(screen.getByText('1 unsaved change')).toBeInTheDocument();
  });

  it('EC-04-UI7 exports: a range over 92 days is refused before any request', async () => {
    const fn = mockApi((url) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('MANAGER') };
      if (url.endsWith('/settings')) return { status: 200, body: settings };
      return undefined;
    });
    renderRoute('/manager/exports');
    const from = await screen.findByLabelText('From');
    await waitFor(() => expect(from).not.toHaveValue(''));
    await userEvent.clear(from);
    await userEvent.type(from, '2020-01-01');
    await userEvent.click(screen.getAllByRole('button', { name: 'Download CSV' })[0] as HTMLElement);
    expect(screen.getByText('Date range must be 1–92 days')).toBeInTheDocument();
    expect(calls(fn, '/reports/orders.csv')).toHaveLength(0);
  });

  it('EC-04-UI8 exports: a server error is shown on the card, not swallowed', async () => {
    mockApi((url) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('ADMIN') };
      if (url.endsWith('/settings')) return { status: 200, body: settings };
      if (url.includes('/reports/statement.csv')) return { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } } };
      return undefined;
    });
    renderRoute('/manager/exports');
    const buttons = await screen.findAllByRole('button', { name: 'Download CSV' });
    await waitFor(() => expect(buttons[1]).toBeEnabled());
    await userEvent.click(buttons[1] as HTMLElement);
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });
});

describe('S17 unexpected error page (AC H-1)', () => {
  it('EC-04-UI10 a crash inside a page shows the friendly error page, not a blank screen', async () => {
    const { render } = await import('@testing-library/react');
    const { AppProviders, createQueryClient } = await import('../providers');
    const { RouteErrorBoundary } = await import('./nextApp');
    mockApi((url) => (url.endsWith('/auth/me') ? { status: 200, body: userOf('MANAGER') } : undefined));
    function Boom(): never {
      throw new Error('boom');
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <AppProviders client={createQueryClient()}>
        <RouteErrorBoundary>
          <Boom />
        </RouteErrorBoundary>
      </AppProviders>,
    );
    expect(await screen.findByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Go to my home/ })).toHaveAttribute('href', '/manager/dashboard');
    spy.mockRestore();
  });
});

describe('Sprint 04 cycle-2 probes (around the BUG-04-001/002 fixes)', () => {
  it('EC-04-UI11 restoring an archived dish without a clash closes the dialog and sends isActive true', async () => {
    const archived = { id: 8, name: 'Old Soup', description: null, category: 'SIDE', pricePaise: 5000, diet: 'VEG', isActive: false };
    const fn = mockApi((url, init) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('MANAGER') };
      if (url.endsWith('/settings')) return { status: 200, body: settings };
      if (url.includes('/menu-items/8') && init?.method === 'PATCH') return { status: 200, body: { ...archived, isActive: true } };
      if (url.includes('/menu-items')) return { status: 200, body: [archived] };
      return undefined;
    });
    renderRoute('/manager/menu-items');
    await userEvent.click(await screen.findByLabelText('Show archived'));
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore item' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Old Soup restored')).toBeInTheDocument();
    const call = calls(fn, '/menu-items/8', 'PATCH')[0];
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ isActive: true });
  });

  it('EC-04-UI12 after a restore clash, renaming clears the error and Save sends the new name', async () => {
    const archived = { id: 8, name: 'Veg Biryani', description: null, category: 'MAIN', pricePaise: 12000, diet: 'VEG', isActive: false };
    const fn = mockApi((url, init) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('MANAGER') };
      if (url.endsWith('/settings')) return { status: 200, body: settings };
      if (url.includes('/menu-items/8') && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as { name?: string };
        return body.name === 'Veg Biryani (old)' ? { status: 200, body: { ...archived, name: body.name, isActive: true } } : duplicate;
      }
      if (url.includes('/menu-items')) return { status: 200, body: [archived] };
      return undefined;
    });
    renderRoute('/manager/menu-items');
    await userEvent.click(await screen.findByLabelText('Show archived'));
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Restore item' }));
    expect(await within(dialog).findByText('An item with this name already exists')).toBeInTheDocument();
    const name = within(dialog).getByLabelText('Dish name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Veg Biryani (old)');
    expect(within(dialog).queryByText('An item with this name already exists')).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('switch', { name: /Active/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(JSON.parse(String(calls(fn, '/menu-items/8', 'PATCH').at(-1)?.[1]?.body))).toMatchObject({ name: 'Veg Biryani (old)', isActive: true });
  });

  it('EC-04-UI13 the search box keeps exactly 100 characters and sends them all', async () => {
    const fn = mockApi((url) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('ADMIN') };
      if (url.endsWith('/settings')) return { status: 200, body: settings };
      if (url.includes('/users?')) return { status: 200, body: { items: [], page: 1, pageSize: 20, total: 0, roleCounts: { ALL: 0, EMPLOYEE: 0, STAFF: 0, MANAGER: 0, ADMIN: 0 } } };
      return undefined;
    });
    renderRoute('/admin/users');
    const input = await screen.findByLabelText('Search users');
    await userEvent.click(input);
    await userEvent.paste(`${'a'.repeat(99)}bc`);
    expect(input).toHaveValue(`${'a'.repeat(99)}b`);
    await waitFor(() => expect(calls(fn, '/users?').some(([u]) => new URL(String(u), 'http://x').searchParams.get('q') === `${'a'.repeat(99)}b`)).toBe(true));
  });
});
