'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { makeSignupFormSchema, PASSWORD_RULES, ROLE_HOME, signupBaseSchema } from '@/shared';
import { ApiError } from '../api/client';
import { useSignup, useSignupConfig } from '../api/hooks';
import { Alert, Button, Card, Icon, PasswordField, TextField } from '../components/ui';
import { AuthLayout } from './AuthLayout';

const FALLBACK = signupBaseSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirm your password') })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

type FormValues = z.infer<typeof FALLBACK>;
const FIELDS = ['name', 'email', 'password', 'confirmPassword'] as const;

/** S2 Sign up (US-01). Validates with the shared schema before any request (US-15 AC1). */
export function SignupPage() {
  const router = useRouter();
  const signup = useSignup();
  const config = useSignupConfig();
  const domains = config.data?.allowedDomains;
  const schema = useMemo(() => (domains?.length ? makeSignupFormSchema(domains) : FALLBACK), [domains]);
  const { register, handleSubmit, formState, watch, setError } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  const password = watch('password') ?? '';
  const generalError = signup.error instanceof ApiError && !Object.keys(signup.error.fields).length ? signup.error : null;

  const onSubmit = handleSubmit(({ confirmPassword: _c, ...values }) =>
    signup.mutate(values, {
      onSuccess: (user) => router.replace(ROLE_HOME[user.role]),
      onError: (err) => {
        if (err instanceof ApiError) {
          for (const f of FIELDS) {
            const msg = err.fields[f];
            if (msg) setError(f, { message: msg }, { shouldFocus: true });
          }
        }
      },
    }),
  );

  return (
    <AuthLayout>
      <Card className="p-6 sm:p-8">
        <h1 className="text-headline-lg">Create your account</h1>
        <p className="mt-1 text-body-md text-text-secondary">
          Use your company email{domains?.length ? ` (${domains.map((d) => `@${d}`).join(', ')})` : ''}.
        </p>
        {generalError && (
          <div className="mt-4">
            <Alert tone="error">{generalError.message}</Alert>
          </div>
        )}
        <form className="mt-5 space-y-4" onSubmit={onSubmit} noValidate>
          <TextField label="Full name" icon="person" autoComplete="name" error={formState.errors.name?.message} {...register('name')} />
          <TextField
            label="Work email"
            type="email"
            icon="mail"
            autoComplete="email"
            placeholder="you@rubicotech.com"
            error={formState.errors.email?.message}
            {...register('email')}
          />
          <div>
            <PasswordField
              label="Password"
              autoComplete="new-password"
              error={formState.errors.password?.message}
              aria-describedby="password-rules"
              {...register('password')}
            />
            <ul id="password-rules" className="mt-2 space-y-1" aria-label="Password rules">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(password);
                const failed = !ok && (formState.errors.password || password.length > 0);
                return (
                  <li key={rule.id} className={`flex items-center gap-1.5 text-body-sm ${ok ? 'text-veg' : failed ? 'text-error' : 'text-text-secondary'}`}>
                    <Icon name={ok ? 'check_circle' : failed ? 'cancel' : 'radio_button_unchecked'} size={16} />
                    {rule.label}
                    <span className="sr-only">{ok ? '(met)' : '(not met)'}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <PasswordField
            label="Confirm password"
            autoComplete="new-password"
            error={formState.errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <Button type="submit" size="lg" fullWidth loading={signup.isPending}>
            Create account
          </Button>
        </form>
        <p className="mt-6 text-center text-body-md text-text-secondary">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
