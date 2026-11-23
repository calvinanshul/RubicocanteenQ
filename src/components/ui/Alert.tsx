import type { ReactNode } from 'react';
import { Icon } from './Icon';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';
const TONES: Record<AlertTone, { cls: string; icon: string }> = {
  info: { cls: 'bg-primary-tint border-primary-fixed text-primary-active', icon: 'info' },
  success: { cls: 'bg-veg-bg border-green-200 text-veg', icon: 'check_circle' },
  warning: { cls: 'bg-warning-bg border-warning-border text-warning-text', icon: 'warning' },
  error: { cls: 'bg-error-bg border-red-200 text-error-text', icon: 'error' },
};

/** Banner: icon + bold lead + text. Errors use role="alert". */
export function Alert({ tone = 'info', title, children, action }: { tone?: AlertTone; title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  const t = TONES[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-tile border px-4 py-3 ${t.cls}`}>
      <Icon name={t.icon} size={20} className="mt-0.5" />
      <div className="min-w-0 flex-1 text-body-md">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
      {action}
    </div>
  );
}
