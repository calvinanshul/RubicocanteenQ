import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { loggedOut, mockApi, renderRoute, userOf } from '../test/utils';

describe('S1 Login', () => {
  it('shows the session-expired banner', async () => {
    mockApi((url) => (url.endsWith('/auth/me') ? loggedOut : undefined));
    renderRoute('/login?expired=1');
    expect(await screen.findByText('Your session expired.')).toBeInTheDocument();
  });

  it('shows the server message for invalid credentials', async () => {
    mockApi((url) => {
      if (url.endsWith('/auth/me')) return loggedOut;
      if (url.endsWith('/auth/login')) return { status: 401, body: { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } } };
      return undefined;
    });
    renderRoute('/login');
    await userEvent.type(await screen.findByLabelText('Work email'), 'priya@rubicotech.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it.each([
    ['EMPLOYEE', '/menu'],
    ['STAFF', '/staff/queue'],
    ['MANAGER', '/manager/dashboard'],
    ['ADMIN', '/admin/users'],
  ] as const)('sends a %s to %s after login (US-02 AC1)', async (role, home) => {
    mockApi((url) => {
      if (url.endsWith('/auth/me')) return loggedOut;
      if (url.endsWith('/auth/login')) return { status: 200, body: { user: userOf(role) } };
      if (url.endsWith('/settings')) return { status: 200, body: { pickupLocation: 'Building 4 · Counter A', orderCutoff: '11:00' } };
      return undefined;
    });
    const { router } = renderRoute('/login');
    await userEvent.type(await screen.findByLabelText('Work email'), 'x@rubicotech.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Lunch2026');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(home));
  });
});
