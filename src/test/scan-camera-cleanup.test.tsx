/**
 * BUG-03-003: leaving the scan page crashed the app ("Something went wrong", no API calls) when the camera had
 * not started. html5-qrcode's stop() throws synchronously unless the scanner is running, and the unmount
 * cleanup called it anyway. The fake below copies that behaviour from html5-qrcode 2.3.8.
 */
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { todayIST } from '../lib/format';
import { calls, mockApi, renderRoute, userOf } from './utils';

type Mode = 'denied' | 'pending' | 'late' | 'running';

const cam = vi.hoisted(() => ({
  mode: 'denied' as Mode,
  resolveLate: null as null | (() => void),
  instances: [] as { scanning: boolean; stop: ReturnType<typeof vi.fn> }[],
}));

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: class {
    scanning = false;
    stop = vi.fn(() => {
      if (!this.scanning) throw 'Cannot stop, scanner is not running or paused.';
      this.scanning = false;
      return Promise.resolve();
    });
    constructor() {
      cam.instances.push(this);
    }
    start(): Promise<null> {
      if (cam.mode === 'denied') return Promise.reject(new Error('NotAllowedError: Permission denied'));
      if (cam.mode === 'pending') return new Promise<null>(() => undefined);
      if (cam.mode === 'late') {
        return new Promise<null>((resolve) => {
          cam.resolveLate = () => {
            this.scanning = true;
            resolve(null);
          };
        });
      }
      this.scanning = true;
      return Promise.resolve(null);
    }
    clear() {
      if (this.scanning) throw 'Cannot clear while scan is ongoing, close it first.';
    }
  },
}));

const TODAY = todayIST();
const placed = {
  id: 9, pickupCode: 'K7Q4MZ', status: 'READY', date: TODAY, slotStart: '13:00', slotEnd: '13:15', employeeName: 'Person 9',
  department: 'Ops', items: [{ name: 'Veg Biryani', qty: 1, diet: 'VEG' }], totalPaise: 12000, readyAt: null, collectedAt: null,
};
const queue = { date: TODAY, slots: [], counts: { ALL: 0, PLACED: 0, PREPARING: 0, READY: 0, COLLECTED: 0, CANCELLED: 0, NO_SHOW: 0 }, lastUpdated: `${TODAY}T07:22:00.000Z`, serverTime: `${TODAY}T07:22:00.000Z` };

function staffApi() {
  return mockApi((url, init) => {
    if (url.endsWith('/auth/me')) return { status: 200, body: userOf('STAFF') };
    if (url.endsWith('/settings')) return { status: 200, body: { pickupLocation: 'Counter A', orderCutoff: '11:00', slotStart: '12:30', slotEnd: '14:30', slotMinutes: 15 } };
    if (url.endsWith('/orders/verify')) return { status: 200, body: { order: placed, warning: null } };
    if (url.endsWith('/orders/9/collect') && init?.method === 'POST') return { status: 200, body: { ...placed, status: 'COLLECTED' } };
    if (url.includes('/api/orders')) return { status: 200, body: queue };
    return undefined;
  });
}

beforeEach(() => {
  cam.instances = [];
  cam.resolveLate = null;
  vi.stubGlobal('navigator', Object.assign(Object.create(navigator) as Navigator, { mediaDevices: { getUserMedia: vi.fn() } }));
});
afterEach(() => vi.unstubAllGlobals());

async function handOverThenOpenQueue() {
  const fetchMock = staffApi();
  renderRoute('/staff/scan');
  await waitFor(() => expect(cam.instances).toHaveLength(1));
  await userEvent.type(await screen.findByLabelText('Pickup code'), 'K7Q4MZ');
  await userEvent.click(screen.getByRole('button', { name: 'Find' }));
  await userEvent.click(await screen.findByRole('button', { name: 'HAND OVER' }));
  expect(await screen.findByText('Handed over')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('link', { name: 'Back to queue' }));
  return fetchMock;
}

describe('scan page camera cleanup (BUG-03-003)', () => {
  it.each<[Mode, string]>([
    ['denied', 'camera permission denied'],
    ['pending', 'camera still starting'],
  ])('EC-03-UI16 hand over with the %s camera, then the queue opens (%s)', async (mode) => {
    cam.mode = mode;
    const fetchMock = await handOverThenOpenQueue();
    expect(await screen.findByRole('heading', { name: "Today's orders" })).toBeInTheDocument();
    expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
    await waitFor(() => expect(calls(fetchMock, '/api/orders').length).toBeGreaterThan(0));
  });

  it('EC-03-UI17 a running camera is stopped when leaving the page', async () => {
    cam.mode = 'running';
    await handOverThenOpenQueue();
    expect(await screen.findByRole('heading', { name: "Today's orders" })).toBeInTheDocument();
    expect(cam.instances[0]?.stop).toHaveBeenCalledTimes(1);
    expect(cam.instances[0]?.scanning).toBe(false);
  });

  it('EC-03-UI18 a camera that starts after leaving the page is stopped, not left on', async () => {
    cam.mode = 'late';
    await handOverThenOpenQueue();
    expect(await screen.findByRole('heading', { name: "Today's orders" })).toBeInTheDocument();
    await act(async () => {
      cam.resolveLate?.();
      await Promise.resolve();
    });
    await waitFor(() => expect(cam.instances[0]?.scanning).toBe(false));
  });
});
