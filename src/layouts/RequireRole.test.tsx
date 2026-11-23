import { screen, waitFor } from '@testing-library/react';
import { loggedOut, mockApi, renderRoute, userOf } from '../test/utils';

const settings = { status: 200, body: { pickupLocation: 'Building 4 · Counter A', orderCutoff: '11:00' } };

describe('role guards (US-03)', () => {
  it('sends a logged-out visitor to login', async () => {
    mockApi((url) => (url.endsWith('/auth/me') ? loggedOut : undefined));
    const { router } = renderRoute('/menu');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('carries the expired flag to the login page', async () => {
    mockApi((url) =>
      url.endsWith('/auth/me') ? { status: 401, body: { error: { code: 'SESSION_EXPIRED', message: 'expired' } } } : undefined,
    );
    renderRoute('/menu');
    expect(await screen.findByText('Your session expired.')).toBeInTheDocument();
  });

  it('shows Not authorised when an employee opens a manager page', async () => {
    mockApi((url) => (url.endsWith('/auth/me') ? { status: 200, body: userOf('EMPLOYEE') } : url.endsWith('/settings') ? settings : undefined));
    const { router } = renderRoute('/manager/dashboard');
    expect(await screen.findByRole('heading', { name: 'Not authorised' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/403');
    expect(screen.getByRole('link', { name: /Go to my menu/ })).toHaveAttribute('href', '/menu');
  });

  it('shows employees only Menu, My orders and Profile (US-03 AC1)', async () => {
    mockApi((url) => (url.endsWith('/auth/me') ? { status: 200, body: userOf('EMPLOYEE') } : url.endsWith('/settings') ? settings : undefined));
    renderRoute('/menu');
    const navs = await screen.findAllByRole('navigation', { name: 'Main' });
    const labels = new Set(navs.flatMap((n) => Array.from(n.querySelectorAll('a')).map((a) => a.textContent?.replace(/^\w+(?=[A-Z])/, '').trim())));
    expect([...labels].sort()).toEqual(['Menu', 'My orders', 'Profile']);
  });

  it('keeps admins out of the manager-only daily menu editor', async () => {
    mockApi((url) => (url.endsWith('/auth/me') ? { status: 200, body: userOf('ADMIN') } : url.endsWith('/settings') ? settings : undefined));
    const { router } = renderRoute('/manager/daily-menu');
    await waitFor(() => expect(router.state.location.pathname).toBe('/403'));
  });

  it('redirects a logged-in user away from /login to their home', async () => {
    mockApi((url) => (url.endsWith('/auth/me') ? { status: 200, body: userOf('STAFF') } : url.endsWith('/settings') ? settings : undefined));
    const { router } = renderRoute('/login');
    await waitFor(() => expect(router.state.location.pathname).toBe('/staff/queue'));
  });
});
