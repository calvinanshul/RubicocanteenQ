'use client';

import { ROLES, USER_SEARCH_MAX, userPatchSchema, zodFieldErrors, type AdminUserDto, type Role, type UserPatchInput } from '@/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useMe, useUpdateUser, useUsers } from '../api/hooks';
import { Alert, Avatar, Button, Dialog, EmptyState, ErrorState, FilterChips, Icon, Skeleton, Switch, TextField, useToast } from '../components/ui';
import { formatDate } from '../lib/format';

export const ROLE_NAMES: Record<Role, string> = { EMPLOYEE: 'Employee', STAFF: 'Staff', MANAGER: 'Manager', ADMIN: 'Admin' };
const CHIP_NAMES: Record<Role, string> = { EMPLOYEE: 'Employees', STAFF: 'Staff', MANAGER: 'Managers', ADMIN: 'Admins' };

type Pending =
  | { kind: 'role'; user: AdminUserDto; role: Role }
  | { kind: 'active'; user: AdminUserDto; isActive: boolean };

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Employee ID and department (U2). */
function EditDetailsDialog({ user, onClose }: { user: AdminUserDto; onClose: () => void }) {
  const [code, setCode] = useState(user.employeeCode ?? '');
  const [dept, setDept] = useState(user.department ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = useUpdateUser();
  const toast = useToast();

  function submit(e: FormEvent) {
    e.preventDefault();
    const body: UserPatchInput = { employeeCode: code.trim() || null, department: dept.trim() || null };
    const parsed = userPatchSchema.safeParse(body);
    if (!parsed.success) return setErrors(zodFieldErrors(parsed.error));
    update.mutate(
      { id: user.id, body: parsed.data },
      {
        onSuccess: () => {
          toast.show(`Details saved for ${user.name}`, 'success');
          onClose();
        },
        onError: (err) => err instanceof ApiError && setErrors(err.fields),
      },
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      icon="badge"
      title={`Edit ${user.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="user-details-form" loading={update.isPending}>Save</Button>
        </>
      }
    >
      <form id="user-details-form" onSubmit={submit} noValidate className="space-y-4">
        <TextField label="Employee ID" value={code} maxLength={20} className="font-mono uppercase" error={errors.employeeCode} hint="Shown on the monthly statement, e.g. EMP-8921" onChange={(e) => setCode(e.target.value)} />
        <TextField label="Department" value={dept} maxLength={60} error={errors.department} onChange={(e) => setDept(e.target.value)} />
      </form>
    </Dialog>
  );
}

/** S14 Users & roles (US-04): search, role filter, 20 per page, confirm before a role change or disabling. */
export function UsersPage() {
  const me = useMe().data?.user;
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 300);
  const [role, setRole] = useState<Role | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const users = useUsers({ q, role: role === 'ALL' ? undefined : role, page });
  const update = useUpdateUser();
  const toast = useToast();
  const [pending, setPending] = useState<Pending | null>(null);
  const [editing, setEditing] = useState<AdminUserDto | null>(null);
  const [banner, setBanner] = useState<{ tone: 'error'; text: string } | null>(null);

  useEffect(() => setPage(1), [q, role]);

  function confirm() {
    if (!pending) return;
    const { user } = pending;
    const body: UserPatchInput = pending.kind === 'role' ? { role: pending.role } : { isActive: pending.isActive };
    update.mutate(
      { id: user.id, body },
      {
        onSuccess: (saved) => {
          const text =
            pending.kind === 'role'
              ? `Role updated. ${saved.name} is now ${ROLE_NAMES[saved.role]}.`
              : saved.isActive
                ? `${saved.name} can log in again.`
                : `${saved.name} is disabled and can no longer log in.`;
          setBanner(null);
          toast.show(text, 'success');
          setPending(null);
        },
        onError: (err) => {
          const text = err instanceof ApiError && err.code === 'LAST_ADMIN' ? 'At least one active admin is required.' : err instanceof ApiError ? err.message : 'Could not update the user';
          setBanner({ tone: 'error', text });
          setPending(null);
        },
      },
    );
  }

  const data = users.data;
  const stale = search.trim() !== q.trim() || users.isPlaceholderData;
  const counts = data?.roleCounts;
  const from = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;
  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-xl-m md:text-headline-xl">Users & roles</h1>
        <p className="text-body-md text-text-secondary">Everyone signs up as an employee. Give staff, managers and admins their role here.</p>
      </div>

      {banner && (
        <Alert tone={banner.tone} action={<Button variant="ghost" size="sm" aria-label="Dismiss" icon="close" onClick={() => setBanner(null)} />}>
          {banner.text}
        </Alert>
      )}

      <div className="card space-y-3 p-4">
        <TextField label="Search users" icon="search" type="search" maxLength={USER_SEARCH_MAX} value={search} onChange={(e) => setSearch(e.target.value.slice(0, USER_SEARCH_MAX))} placeholder="Name, email, employee ID or department" />
        <FilterChips
          label="Filter by role"
          value={role}
          onChange={setRole}
          chips={[{ value: 'ALL' as const, label: 'All', count: counts?.ALL }, ...ROLES.map((r) => ({ value: r, label: CHIP_NAMES[r], count: counts?.[r] }))]}
        />
      </div>

      {/* Rows from an older search must never be actionable: acting on them could change the wrong person */}
      {users.isPending || stale ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading users">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : users.isError ? (
        <div className="card"><ErrorState message="We couldn't load the users." onRetry={() => void users.refetch()} /></div>
      ) : !data || data.items.length === 0 ? (
        <div className="card"><EmptyState icon="person_search" title="No users match">Try another name, email or role.</EmptyState></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-body-md">
            <thead className="bg-surface-cream text-label-md uppercase tracking-wider text-text-secondary">
              <tr>
                <th scope="col" className="px-4 py-3">User</th>
                <th scope="col" className="px-4 py-3">Employee ID</th>
                <th scope="col" className="px-4 py-3">Department</th>
                <th scope="col" className="px-4 py-3">Role</th>
                <th scope="col" className="px-4 py-3">Active</th>
                <th scope="col" className="px-4 py-3">Joined</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id} className={`border-t border-border-sand ${u.isActive ? '' : 'opacity-60'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} role={u.role} />
                      <div className="min-w-0">
                        <p className="text-label-lg">{u.name}{u.id === me?.id && <span className="ml-1 text-body-sm text-text-secondary">(you)</span>}</p>
                        <p className="truncate text-body-sm text-text-secondary">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono">{u.employeeCode ?? '—'}</td>
                  <td className="px-4 py-3">{u.department ?? '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Role for ${u.name}`}
                      value={u.role}
                      disabled={update.isPending}
                      onChange={(e) => setPending({ kind: 'role', user: u, role: e.target.value as Role })}
                      className="min-h-[40px] rounded-btn border border-border-sand-strong bg-white px-2 text-body-md focus:border-primary focus:shadow-focus focus:outline-none"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_NAMES[r]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Switch checked={u.isActive} tone="green" label={`Active: ${u.name}`} disabled={update.isPending} onChange={(v) => setPending({ kind: 'active', user: u, isActive: v })} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{formatDate(u.createdAt.slice(0, 10), true)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" icon="edit" aria-label={`Edit details for ${u.name}`} onClick={() => setEditing(u)}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-sand px-4 py-3">
            <p className="text-body-sm text-text-secondary">
              <span className="font-mono">{from}–{to}</span> of <span className="font-mono">{data.total}</span>
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon="chevron_left" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}

      <p className="flex items-center gap-2 text-body-sm text-text-secondary">
        <Icon name="info" size={18} /> At least one active admin is always required.
      </p>

      {pending && (
        <Dialog
          open
          onClose={() => setPending(null)}
          icon={pending.kind === 'role' ? 'manage_accounts' : pending.isActive ? 'person_check' : 'person_off'}
          title={pending.kind === 'role' ? 'Change role?' : pending.isActive ? 'Enable account?' : 'Disable account?'}
          footer={
            <>
              <Button variant="secondary" onClick={() => setPending(null)}>Cancel</Button>
              <Button variant={pending.kind === 'active' && !pending.isActive ? 'danger' : 'primary'} loading={update.isPending} onClick={confirm}>Confirm</Button>
            </>
          }
        >
          <p className="text-body-md">
            {pending.kind === 'role' ? (
              <>Change <strong>{pending.user.name}</strong> from {ROLE_NAMES[pending.user.role]} to <strong>{ROLE_NAMES[pending.role]}</strong>? They get the new screens on their next page load.</>
            ) : pending.isActive ? (
              <>Let <strong>{pending.user.name}</strong> log in again?</>
            ) : (
              <><strong>{pending.user.name}</strong> will be logged out and can't log in until enabled again. Their orders stay on record.</>
            )}
          </p>
        </Dialog>
      )}

      {editing && <EditDetailsDialog user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
