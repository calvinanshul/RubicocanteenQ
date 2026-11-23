import type { ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-tile bg-border-sand ${className}`} />;
}

export function EmptyState({ icon = 'inbox', title, children, action }: { icon?: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint text-primary">
        <Icon name={icon} size={28} />
      </span>
      <h2 className="text-headline-md">{title}</h2>
      {children && <div className="mt-1 max-w-md text-body-md text-text-secondary">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState icon="cloud_off" title="Something went wrong" action={onRetry && <Button variant="secondary" icon="refresh" onClick={onRetry}>Try again</Button>}>
      {message}
    </EmptyState>
  );
}
