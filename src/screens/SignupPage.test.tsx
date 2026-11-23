import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, loggedOut, mockApi, renderRoute, userOf } from '../test/utils';

function api(overrides: Partial<Record<string, { status: number; body?: unknown }>> = {}) {
  return mockApi((url, init) => {
    if (url.endsWith('/auth/me')) return loggedOut;
    if (url.endsWith('/auth/signup-config')) return { status: 200, body: { allowedDomains: ['rubicotech.com'] } };
    if (url.endsWith('/auth/signup') && init?.method === 'POST') return overrides.signup ?? { status: 201, body: userOf('EMPLOYEE') };
    if (url.endsWith('/settings')) return { status: 200, body: { pickupLocation: 'Building 4 · Counter A', orderCutoff: '11:00' } };
    return undefined;
  });
}

// TC-UI-01 / US-15 AC1: client validation before any request
describe('S2 Sign up', () => {
  it('shows inline errors for an empty form without calling the API', async () => {
    const fetchMock = api();
    renderRoute('/signup');
    await userEvent.click(await screen.findByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Name must be 2–80 characters')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password must be 8–64 characters with at least one letter and one number')).toBeInTheDocument();
    expect(screen.getByText('Confirm your password')).toBeInTheDocument();
    expect(calls(fetchMock, '/auth/signup', 'POST')).toHaveLength(0);
  });

  it('rejects a non-company domain before sending', async () => {
    const fetchMock = api();
    renderRoute('/signup');
    await screen.findByText(/@rubicotech\.com/);
    await userEvent.type(screen.getByLabelText('Full name'), 'Priya Sharma');
    await userEvent.type(screen.getByLabelText('Work email'), 'priya@gmail.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Lunch2026');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Lunch2026');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Use your company email (@rubicotech.com)')).toBeInTheDocument();
    expect(calls(fetchMock, '/auth/signup', 'POST')).toHaveLength(0);
  });

  it('flags mismatched passwords', async () => {
    api();
    renderRoute('/signup');
    await userEvent.type(await screen.findByLabelText('Full name'), 'Priya Sharma');
    await userEvent.type(screen.getByLabelText('Work email'), 'priya@rubicotech.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Lunch2026');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Lunch2027');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
  });

  it('signs up and lands on the menu', async () => {
    const fetchMock = api();
    const { router } = renderRoute('/signup');
    await userEvent.type(await screen.findByLabelText('Full name'), 'Priya Sharma');
    await userEvent.type(screen.getByLabelText('Work email'), '  Priya@Rubicotech.com ');
    await userEvent.type(screen.getByLabelText('Password'), 'Lunch2026');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Lunch2026');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/menu'));
    const [, init] = calls(fetchMock, '/auth/signup', 'POST')[0] ?? [];
    expect(JSON.parse(String(init?.body))).toEqual({ name: 'Priya Sharma', email: 'priya@rubicotech.com', password: 'Lunch2026' });
  });

  it('shows the server duplicate-email error on the email field', async () => {
    api({ signup: { status: 409, body: { error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists', fields: { email: 'An account with this email already exists' } } } } });
    renderRoute('/signup');
    await userEvent.type(await screen.findByLabelText('Full name'), 'Priya Sharma');
    await userEvent.type(screen.getByLabelText('Work email'), 'priya@rubicotech.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Lunch2026');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Lunch2026');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument();
    expect(screen.getByLabelText('Work email')).toHaveAttribute('aria-invalid', 'true');
  });
});
