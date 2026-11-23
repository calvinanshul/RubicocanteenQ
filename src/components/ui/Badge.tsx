import type { OrderStatus } from '@/shared';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

const STATUS: Record<OrderStatus, { label: string; icon: string; cls: string }> = {
  PLACED: { label: 'Placed', icon: 'receipt_long', cls: 'bg-primary-tint text-primary-active border-primary-fixed' },
  PREPARING: { label: 'Preparing', icon: 'skillet', cls: 'bg-warning-bg text-warning-text border-warning-border' },
  READY: { label: 'Ready', icon: 'check_circle', cls: 'bg-veg-bg text-veg border-green-200' },
  COLLECTED: { label: 'Collected', icon: 'done_all', cls: 'bg-border-sand text-text-primary border-border-sand-strong' },
  CANCELLED: { label: 'Cancelled', icon: 'block', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  NO_SHOW: { label: 'No-show', icon: 'person_off', cls: 'bg-error-bg text-error-text border-red-200' },
};

/** Status by icon + text, never colour alone. */
export function StatusBadge({ status }: { status: OrderStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-label-md font-semibold ${s.cls}`}>
      <Icon name={s.icon} size={16} />
      {s.label}
    </span>
  );
}

export type PillTone = 'neutral' | 'primary' | 'warning' | 'success' | 'error' | 'selected';
const TONES: Record<PillTone, string> = {
  neutral: 'bg-white text-text-secondary border-border-sand-strong',
  primary: 'bg-primary-tint text-primary-active border-primary-fixed',
  warning: 'bg-warning-bg text-warning-text border-warning-border',
  success: 'bg-veg-bg text-veg border-green-200',
  error: 'bg-error-bg text-error-text border-red-200',
  selected: 'bg-primary text-white border-primary',
};

export function Pill({ tone = 'neutral', icon, mono, children }: { tone?: PillTone; icon?: string; mono?: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-label-md font-semibold ${mono ? 'font-mono tabular' : ''} ${TONES[tone]}`}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}
