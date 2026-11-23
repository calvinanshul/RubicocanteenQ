'use client';

import { useMe } from '../api/hooks';
import { Avatar, Button, Card } from '../components/ui';
import { useLogoutAction } from '../layouts/useLogoutAction';

export function ProfilePage() {
  const user = useMe().data?.user;
  const logout = useLogoutAction();
  if (!user) return null;
  const rows: [string, string][] = [
    ['Email', user.email],
    ['Employee ID', user.employeeCode ?? '—'],
    ['Department', user.department ?? '—'],
  ];
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-headline-xl-m">Profile</h1>
      <Card className="mt-6 p-6">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} role={user.role} size={56} />
          <div>
            <p className="text-headline-md">{user.name}</p>
            <p className="text-body-md capitalize text-text-secondary">{user.role.toLowerCase()}</p>
          </div>
        </div>
        <dl className="mt-6 divide-y divide-border-sand">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-3">
              <dt className="text-text-secondary">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <Button variant="danger" icon="logout" fullWidth className="mt-6" onClick={logout.run} loading={logout.pending}>
          Log out
        </Button>
      </Card>
    </div>
  );
}
