'use client';

import Link from 'next/link';
import { ROLE_HOME } from '@/shared';
import { useMe } from '../api/hooks';
import { Button, Icon } from '../components/ui';
import { useLogoutAction } from '../layouts/useLogoutAction';

function ErrorLayout({ icon, code, title, children }: { icon: string; code: string; title: string; children: React.ReactNode }) {
  const user = useMe().data?.user;
  const logout = useLogoutAction();
  const home = user ? ROLE_HOME[user.role] : '/login';
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-tint text-primary">
          <Icon name={icon} size={32} />
        </span>
        <p className="mt-5 font-mono text-label-md tracking-widest text-text-secondary">{code}</p>
        <h1 className="mt-1 text-headline-lg">{title}</h1>
        <p className="mt-2 text-body-md text-text-secondary">{children}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href={home} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-btn bg-primary px-5 text-label-lg font-semibold text-white hover:bg-primary-hover">
            <Icon name="home" size={20} /> {user?.role === 'EMPLOYEE' ? 'Go to my menu' : user ? 'Go to my home' : 'Go to login'}
          </Link>
          {user && (
            <Button variant="ghost" onClick={logout.run} loading={logout.pending}>
              Log out
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

/** S17 (US-03 AC2) */
export function NotAuthorisedPage() {
  return (
    <ErrorLayout icon="lock" code="ERROR 403" title="Not authorised">
      This page isn't for your role. If you think you need access, ask your admin.
    </ErrorLayout>
  );
}

export function NotFoundPage() {
  return (
    <ErrorLayout icon="search_off" code="ERROR 404" title="We couldn't find that page">
      The link may be old or mistyped.
    </ErrorLayout>
  );
}

export function UnexpectedErrorPage() {
  return (
    <ErrorLayout icon="error" code="ERROR" title="Something went wrong">
      Try again. If it keeps happening, contact the admin.
    </ErrorLayout>
  );
}
