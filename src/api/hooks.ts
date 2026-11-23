import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminUserDto,
  ClosedDateDto,
  ClosedDateInput,
  MenuItemInput,
  MyOrdersPage,
  Role,
  SettingsInput,
  UserPatchInput,
  UsersPage,
  DashboardDto,
  PrepItemDto,
  QueueDto,
  StaffOrderDto,
  VerifyDto,
  DailyMenuDto,
  DailyMenuPutInput,
  LoginInput,
  MenuItemDto,
  OrderDto,
  OrderInput,
  Page,
  PublicSettings,
  PublicUser,
  SignupInput,
  SlotDto,
} from '@/shared';
import { USER_SEARCH_MAX } from '@/shared';
import { clearCartStorage } from '../features/cart/storage';
import { ApiError, api } from './client';

export interface MeState {
  user: PublicUser | null;
  expired: boolean;
}

/** The logged-in user, or null. A 401 is a normal "logged out" answer here. */
export function useMe() {
  return useQuery<MeState>({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return { user: await api<PublicUser>('/auth/me'), expired: false };
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          return { user: null, expired: err.code === 'SESSION_EXPIRED' };
        }
        throw err;
      }
    },
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api<{ user: PublicUser }>('/auth/login', { method: 'POST', body: input }),
    onSuccess: ({ user }) => qc.setQueryData<MeState>(['me'], { user, expired: false }),
  });
}

export function useSignup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SignupInput) => api<PublicUser>('/auth/signup', { method: 'POST', body: input }),
    onSuccess: (user) => qc.setQueryData<MeState>(['me'], { user, expired: false }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      clearCartStorage();
      qc.clear();
      qc.setQueryData<MeState>(['me'], { user: null, expired: false });
    },
  });
}

export function useSignupConfig() {
  return useQuery({
    queryKey: ['signup-config'],
    queryFn: () => api<{ allowedDomains: string[] }>('/auth/signup-config'),
    staleTime: Infinity,
  });
}

export function useSettings(enabled = true) {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api<PublicSettings>('/settings'),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useMenuItems() {
  return useQuery({ queryKey: ['menu-items'], queryFn: () => api<MenuItemDto[]>('/menu-items?active=true') });
}

/** M4. Returns null when the menu isn't published (422). `poll` refreshes stock (S3 polls every 30 s). */
export function useDailyMenu(date: string, poll?: number, enabled = true) {
  return useQuery({
    queryKey: ['daily-menu', date],
    refetchInterval: poll,
    enabled: enabled && Boolean(date),
    queryFn: async () => {
      try {
        return await api<DailyMenuDto>(`/daily-menu?date=${date}`);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'MENU_NOT_PUBLISHED') return null;
        throw err;
      }
    },
  });
}

export function useSaveDailyMenu(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DailyMenuPutInput) => api<DailyMenuDto>(`/daily-menu/${date}`, { method: 'PUT', body: input }),
    onSuccess: (menu) => qc.setQueryData(['daily-menu', date], menu),
  });
}

/** M6: pickup slots with remaining capacity. */
export function useSlots(date: string) {
  return useQuery({ queryKey: ['slots', date], queryFn: () => api<SlotDto[]>(`/slots?date=${date}`), refetchInterval: 30_000, enabled: Boolean(date) });
}

/** O2 filtered to one date: used for "You already have an order". */
export function useMyOrdersOn(date: string, enabled = true) {
  return useQuery({
    queryKey: ['my-orders', date],
    queryFn: () => api<Page<OrderDto>>(`/orders/me?date=${date}`),
    enabled: enabled && Boolean(date),
  });
}

const LIVE = new Set(['PLACED', 'PREPARING', 'READY']);

/** O3, polled every 20 s while the order can still change (US-11 AC2). */
export function useOrder(id: number) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => api<OrderDto>(`/orders/${id}`),
    refetchInterval: (q) => (q.state.data && LIVE.has(q.state.data.status) ? 20_000 : false),
  });
}

/** O1 with an Idempotency-Key so a double tap or retry can't create two orders (US-09 AC9). */
export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, key }: { body: OrderInput; key: string }) =>
      api<OrderDto>('/orders', { method: 'POST', body, headers: { 'Idempotency-Key': key } }),
    onSuccess: (order) => {
      qc.setQueryData(['order', order.id], order);
      void qc.invalidateQueries({ queryKey: ['daily-menu', order.date] });
      void qc.invalidateQueries({ queryKey: ['my-orders'] });
      void qc.invalidateQueries({ queryKey: ['slots', order.date] });
    },
  });
}

/** O5 */
export function useCancelOrder(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<OrderDto>(`/orders/${id}/cancel`, { method: 'POST' }),
    onSuccess: (order) => {
      qc.setQueryData(['order', id], order);
      void qc.invalidateQueries({ queryKey: ['daily-menu', order.date] });
      void qc.invalidateQueries({ queryKey: ['my-orders'] });
      void qc.invalidateQueries({ queryKey: ['slots', order.date] });
    },
  });
}

/* ---------------- Staff and manager (Sprint 3) ---------------- */

/** Q1: today's queue on the server clock; polled every 15 s (US-12). */
export function useQueue() {
  return useQuery({ queryKey: ['queue'], queryFn: () => api<QueueDto>('/orders'), refetchInterval: 15_000 });
}

/** Q2 */
export function useSetStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'PREPARING' | 'READY' | 'NO_SHOW' }) =>
      api<StaffOrderDto>(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['queue'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Q3 */
export function useVerifyCode() {
  return useMutation({ mutationFn: (pickupCode: string) => api<VerifyDto>('/orders/verify', { method: 'POST', body: { pickupCode } }) });
}

/** Q4 */
export function useCollect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<StaffOrderDto>(`/orders/${id}/collect`, { method: 'POST' }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['queue'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['prep-list'] });
    },
  });
}

/** R2: portions per dish (today on the server clock unless a date is given). */
export function usePrepList(date?: string) {
  return useQuery({
    queryKey: ['prep-list', date ?? 'today'],
    queryFn: () => api<PrepItemDto[]>(`/reports/prep-list${date ? `?date=${date}` : ''}`),
    refetchInterval: 30_000,
  });
}

/** R1: polled every 30 s. */
export function useDashboard(date?: string) {
  return useQuery({
    queryKey: ['dashboard', date ?? 'today'],
    queryFn: () => api<DashboardDto>(`/reports/dashboard${date ? `?date=${date}` : ''}`),
    refetchInterval: 30_000,
  });
}

/** X3: the server clock (honours the test clock). Read once, then refreshed every 5 minutes. */
export function useServerTime() {
  return useQuery({
    queryKey: ['server-time'],
    queryFn: () => api<{ serverTime: string; today: string }>('/time'),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}

/* ---------------- Run the canteen (Sprint 4) ---------------- */

/** O2, 10 per page with "Load more" (S6). */
export function useMyOrders() {
  return useInfiniteQuery({
    queryKey: ['my-orders', 'history'],
    queryFn: ({ pageParam }) => api<MyOrdersPage>(`/orders/me?page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
}

/** M1 with archived items (S11 catalogue). */
export function useCatalogue() {
  return useQuery({ queryKey: ['menu-items', 'all'], queryFn: () => api<MenuItemDto[]>('/menu-items?active=false') });
}

export type MenuItemPatch = Partial<MenuItemInput> & { isActive?: boolean };

/** M2 (no id) or M3 (with id). Refreshes the catalogue and the daily-menu editor's dish list. */
export function useSaveMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: MenuItemPatch }) =>
      id ? api<MenuItemDto>(`/menu-items/${id}`, { method: 'PATCH', body }) : api<MenuItemDto>('/menu-items', { method: 'POST', body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['menu-items'] }),
  });
}

export interface UsersParams {
  q: string;
  role?: Role;
  page: number;
}

/** U1, keeping the previous page on screen while the next loads. */
export function useUsers({ q, role, page }: UsersParams) {
  // Never send more than the API accepts (BUG-04-002): a longer search can't match anyone anyway
  const text = q.trim().slice(0, USER_SEARCH_MAX).trim();
  const qs = new URLSearchParams({ page: String(page) });
  if (text) qs.set('q', text);
  if (role) qs.set('role', role);
  return useQuery({
    queryKey: ['users', text, role ?? 'ALL', page],
    queryFn: () => api<UsersPage>(`/users?${qs.toString()}`),
    placeholderData: keepPreviousData,
  });
}

/** U2 */
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UserPatchInput }) => api<AdminUserDto>(`/users/${id}`, { method: 'PATCH', body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

/** S2 */
export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SettingsInput) => api<PublicSettings>('/settings', { method: 'PUT', body }),
    onSuccess: (saved) => {
      qc.setQueryData(['settings'], saved);
      void qc.invalidateQueries({ queryKey: ['signup-config'] });
    },
  });
}

/** S3: upcoming holidays from a date. */
export function useClosedDates(from: string | null) {
  return useQuery({
    queryKey: ['closed-dates', from],
    queryFn: () => api<ClosedDateDto[]>(`/closed-dates?from=${from ?? ''}`),
    enabled: Boolean(from),
  });
}

/** S4 / S5 */
export function useClosedDateActions() {
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ['closed-dates'] });
  return {
    add: useMutation({ mutationFn: (body: ClosedDateInput) => api<ClosedDateDto>('/closed-dates', { method: 'POST', body }), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (date: string) => api<void>(`/closed-dates/${date}`, { method: 'DELETE' }), onSuccess: refresh }),
  };
}
