'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginSchema, ROLE_HOME, type LoginInput } from '@/shared';
import { ApiError } from '../api/client';
import { useLogin } from '../api/hooks';
import { Alert, Button, Card, PasswordField, TextField } from '../components/ui';
import { AuthLayout } from './AuthLayout';

/** S1 Login (US-02). */
export function LoginPage() {
  const params = useSearchParams();
  const router = useRouter();
  const login = useLogin();
  const { register, handleSubmit, formState } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const expired = params.get('expired') === '1';
  const serverError = login.error instanceof ApiError ? login.error : null;

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: ({ user }) => {
        const next = params.get('next');
        const home = ROLE_HOME[user.role];
        // Only follow ?next= inside the user's own area; guards handle the rest.
        router.replace(next && next.startsWith('/') && next.split('/')[1] === home.split('/')[1] ? next : home);
      },
    }),
  );

  return (
    <AuthLayout>
      <Card className="p-6 sm:p-8">
        <h1 className="text-headline-lg">Welcome back</h1>
        <p className="mt-1 text-body-md text-text-secondary">Log in with your work email.</p>
        <div className="mt-5 space-y-3">
          {expired && !serverError && (
            <Alert tone="info" title="Your session expired.">
              Please log in again.
            </Alert>
          )}
          {serverError && <Alert tone="error">{serverError.message}</Alert>}
        </div>
        <form className="mt-5 space-y-4" onSubmit={onSubmit} noValidate>
          <TextField
            label="Work email"
            type="email"
            icon="mail"
            autoComplete="email"
            placeholder="you@rubicotech.com"
            error={formState.errors.email?.message}
            {...register('email')}
          />
          <PasswordField
            label="Password"
            autoComplete="current-password"
            error={formState.errors.password?.message}
            trailingLabel={<span className="text-body-sm text-text-secondary">Forgot password? Ask your admin.</span>}
            {...register('password')}
          />
          <p className="text-body-sm text-text-secondary">You'll stay logged in for 8 hours on this device.</p>
          <Button type="submit" size="lg" fullWidth loading={login.isPending}>
            Log in
          </Button>
        </form>
        <p className="mt-6 text-center text-body-md text-text-secondary">
          New here?{' '}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
