import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProviders, createQueryClient } from '../providers';
import { addDays, todayIST } from '../lib/format';
import { DevGallery } from '../screens/DevGallery';
import { calls, loggedOut, mockApi, renderRoute, userOf } from './utils';

const settings = { status: 200, body: { pickupLocation: 'Building 4 · Counter A', orderCutoff: '11:00' } };
const dishes = [{ id: 1, name: 'Veg Biryani', description: null, category: 'MAIN', pricePaise: 12000, diet: 'VEG', isActive: true }];
function menuFor(date: string) {
  return {
    date, orderingOpen: true, cutoff: '11:00', closed: false, pickupLocation: 'Building 4 · Counter A',
    items: [{ dailyMenuItemId: 1, menuItemId: 1, name: 'Veg Biryani', description: null, pricePaise: 12000, diet: 'VEG', category: 'MAIN', quantity: 80, ordered: 0, remaining: 80 }],
  };
}

// AC 01-1: UI kit gallery renders every component without crashing
describe('UI kit gallery (AC 01-1)', () => {
  it('renders the components and opens the dialog', async () => {
    render(
      <AppProviders client={createQueryClient()}>
        <DevGallery />
      </AppProviders>,
    );
    expect(screen.getByText('UI kit · Fresh Counter')).toBeInTheDocument();
    for (const s of ['Placed', 'Preparing', 'Ready', 'Collected', 'Cancelled', 'No-show']) expect(screen.getByText(s)).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'Veg' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: 'Non-veg' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
    expect(screen.getByRole('dialog', { name: 'Cancel this order?' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show toast' }));
    expect(await screen.findByText('Menu saved')).toBeInTheDocument();
  });
});

// AC 01-12: a 401 SESSION_EXPIRED on a data request sends the user to login with the banner
describe('session expiry mid-session (AC 01-12)', () => {
  it('redirects to /login?expired=1 and shows the banner', async () => {
    let expired = false;
    mockApi((url) => {
      if (url.endsWith('/auth/me')) return expired ? { status: 401, body: { error: { code: 'SESSION_EXPIRED', message: 'expired' } } } : { status: 200, body: userOf('MANAGER') };
      if (url.endsWith('/settings')) return settings;
      if (url.includes('/menu-items')) {
        expired = true;
        return { status: 401, body: { error: { code: 'SESSION_EXPIRED', message: 'Your session expired. Please log in again.' } } };
      }
      if (url.includes('/daily-menu')) return { status: 200, body: menuFor(addDays(todayIST(), 1)) };
      return undefined;
    });
    // The real App registers the 401 handler; renderRoute mirrors that through App's router setup.
    const { App } = await import('./utils');
    window.history.pushState({}, '', '/manager/daily-menu');
    render(<App />);
    expect(await screen.findByText('Your session expired.')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
    expect(window.location.search).toContain('expired=1');
  });
});

// AC 01-5: live password checklist
describe('password rule checklist (AC 01-5)', () => {
  it('ticks rules as the password is typed', async () => {
    mockApi((url) => (url.endsWith('/auth/me') ? loggedOut : url.endsWith('/signup-config') ? { status: 200, body: { allowedDomains: ['rubicotech.com'] } } : undefined));
    renderRoute('/signup');
    const pw = await screen.findByLabelText('Password');
    await userEvent.type(pw, 'abc');
    const rules = screen.getByRole('list', { name: 'Password rules' });
    expect(rules).toHaveTextContent('At least one letter(met)');
    expect(rules).toHaveTextContent('At least one number(not met)');
    await userEvent.type(pw, 'defgh1');
    expect(rules).toHaveTextContent('8–64 characters(met)');
    expect(rules).toHaveTextContent('At least one number(met)');
  });
});

// UI spec §7: errors are linked to their field and announced
describe('error messages are linked to their fields (UI spec §7)', () => {
  it('the password field references its error message', async () => {
    mockApi((url) => (url.endsWith('/auth/me') ? loggedOut : url.endsWith('/signup-config') ? { status: 200, body: { allowedDomains: ['rubicotech.com'] } } : undefined));
    renderRoute('/signup');
    await userEvent.type(await screen.findByLabelText('Password'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    const pw = screen.getByLabelText('Password');
    await waitFor(() => expect(pw).toHaveAttribute('aria-invalid', 'true'));
    expect(pw).toHaveAccessibleDescription(expect.stringContaining('Password must be 8–64 characters'));
  });

  it('the email field references its error message', async () => {
    mockApi((url) => (url.endsWith('/auth/me') ? loggedOut : url.endsWith('/signup-config') ? { status: 200, body: { allowedDomains: ['rubicotech.com'] } } : undefined));
    renderRoute('/signup');
    await userEvent.type(await screen.findByLabelText('Work email'), 'x@gmail.com');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(screen.getByLabelText('Work email')).toHaveAccessibleDescription('Use your company email (@rubicotech.com)'));
  });
});

// Login ?next= must never leave the app or the user's own area
describe('login redirect safety', () => {
  it.each(['//evil.example.com', '/\\evil.example.com', 'https://evil.example.com', '/manager/daily-menu'])('an employee with next=%s lands on /menu', async (next) => {
    mockApi((url) => {
      if (url.endsWith('/auth/me')) return loggedOut;
      if (url.endsWith('/auth/login')) return { status: 200, body: { user: userOf('EMPLOYEE') } };
      if (url.endsWith('/settings')) return settings;
      return undefined;
    });
    const { router } = renderRoute(`/login?next=${encodeURIComponent(next)}`);
    await userEvent.type(await screen.findByLabelText('Work email'), 'priya@rubicotech.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Lunch2026');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/menu'));
  });

  it('a manager returns to the page they were sent from', async () => {
    mockApi((url) => {
      if (url.endsWith('/auth/me')) return loggedOut;
      if (url.endsWith('/auth/login')) return { status: 200, body: { user: userOf('MANAGER') } };
      if (url.endsWith('/settings')) return settings;
      if (url.includes('/menu-items')) return { status: 200, body: dishes };
      if (url.includes('/daily-menu')) return { status: 200, body: menuFor(addDays(todayIST(), 1)) };
      return undefined;
    });
    const { router } = renderRoute('/login?next=%2Fmanager%2Fdaily-menu');
    await userEvent.type(await screen.findByLabelText('Work email'), 'manager@rubicotech.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Lunch2026');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/manager/daily-menu'));
  });
});

// AC 02-6: date stepper and URL handling in the S13 editor
describe('S13 date stepper (AC 02-6)', () => {
  function api() {
    return mockApi((url) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('MANAGER') };
      if (url.endsWith('/settings')) return settings;
      if (url.includes('/menu-items')) return { status: 200, body: dishes };
      const m = /daily-menu\?date=([\d-]+)$/.exec(url);
      if (m?.[1]) return { status: 200, body: menuFor(m[1]) };
      if (url.includes('/daily-menu?date=')) return { status: 400, body: { error: { code: 'VALIDATION_ERROR', message: 'Please fix the highlighted fields', fields: { date: 'Use the format YYYY-MM-DD' } } } };
      return undefined;
    });
  }

  it('defaults to tomorrow and steps to the next and previous day', async () => {
    const fetchMock = api();
    const tomorrow = addDays(todayIST(), 1);
    renderRoute('/manager/daily-menu');
    expect(await screen.findByText('Tomorrow')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next day' }));
    await waitFor(() => expect(calls(fetchMock, `/daily-menu?date=${addDays(tomorrow, 1)}`).length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }));
    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(await screen.findByText('Today')).toBeInTheDocument();
  });

  it('falls back to a valid date when the URL date is invalid', async () => {
    api();
    renderRoute('/manager/daily-menu?date=garbage');
    expect(await screen.findByTestId('menu-date')).not.toHaveTextContent(/undefined|NaN/);
    expect(screen.queryByText("We couldn't load the menu.")).not.toBeInTheDocument();
  });
});

// Cycle 2 probes around the fixes
describe('cycle 2: closed-day editor round-trip (BUG-01-001)', () => {
  it('keeps saved dishes switched on after saving a closed day', async () => {
    const date = addDays(todayIST(), 3);
    const closedMenu = { ...menuFor(date), closed: true, orderingOpen: false };
    const fetchMock = mockApi((url, init) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('MANAGER') };
      if (url.endsWith('/settings')) return settings;
      if (url.includes('/menu-items')) return { status: 200, body: dishes };
      if (url.includes(`/daily-menu/${date}`) && init?.method === 'PUT') return { status: 200, body: closedMenu };
      if (url.includes(`/daily-menu?date=${date}`)) return { status: 200, body: closedMenu };
      return undefined;
    });
    renderRoute(`/manager/daily-menu?date=${date}`);
    expect(await screen.findByText('The canteen is closed on this day.')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'On menu: Veg Biryani' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Save menu' }));
    await waitFor(() => expect(calls(fetchMock, '/daily-menu/', 'PUT')).toHaveLength(1));
    expect(await screen.findByText(/Menu saved/)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'On menu: Veg Biryani' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Portions for Veg Biryani')).toHaveValue(80);
  });
});

describe('cycle 2: stepping from an invalid URL date (BUG-01-003)', () => {
  it('steps from the fallback to a real next day', async () => {
    const fetchMock = mockApi((url) => {
      if (url.endsWith('/auth/me')) return { status: 200, body: userOf('MANAGER') };
      if (url.endsWith('/settings')) return settings;
      if (url.includes('/menu-items')) return { status: 200, body: dishes };
      const m = /daily-menu\?date=([\d-]+)$/.exec(url);
      return m?.[1] ? { status: 200, body: menuFor(m[1]) } : undefined;
    });
    renderRoute('/manager/daily-menu?date=2026-02-30');
    expect(await screen.findByText('Tomorrow')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next day' }));
    const target = addDays(addDays(todayIST(), 1), 1);
    await waitFor(() => expect(calls(fetchMock, `/daily-menu?date=${target}`).length).toBeGreaterThan(0));
    expect(calls(fetchMock, 'date=2026-02-30')).toHaveLength(0);
  });
});
