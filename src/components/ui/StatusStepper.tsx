import type { OrderStatus } from '@/shared';
import { Icon } from './Icon';

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'PLACED', label: 'Placed' },
  { status: 'PREPARING', label: 'Preparing' },
  { status: 'READY', label: 'Ready' },
  { status: 'COLLECTED', label: 'Collected' },
];

/** 4-step tracker: done = green check, current = larger with ring, todo = sand (UI spec §3). */
export function StatusStepper({ status }: { status: OrderStatus }) {
  const current = STEPS.findIndex((s) => s.status === status);
  return (
    <ol aria-label="Order status" className="grid grid-cols-4 gap-1">
      {STEPS.map((s, i) => {
        const done = i < current || status === 'COLLECTED';
        const isCurrent = i === current && status !== 'COLLECTED';
        return (
          <li key={s.status} aria-current={isCurrent ? 'step' : undefined} className="flex flex-col items-center gap-1.5 text-center">
            <span
              className={`flex items-center justify-center rounded-full ${isCurrent ? 'h-9 w-9 bg-primary text-white ring-4 ring-primary-fixed' : done ? 'h-7 w-7 bg-veg text-white' : 'h-7 w-7 bg-border-sand text-text-secondary'}`}
            >
              {done ? <Icon name="check" size={16} /> : <span className="font-mono text-label-md">{i + 1}</span>}
            </span>
            <span className={`text-label-md ${isCurrent ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
              {s.label}
              <span className="sr-only">{done ? ' (done)' : isCurrent ? ' (current)' : ''}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
