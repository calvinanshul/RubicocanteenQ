import type { ReactNode } from 'react';
import { Icon } from './Icon';

/** KPI tile: label + icon, mono big number, optional sub-line (UI spec §3). */
export function KpiTile({ label, icon, value, sub, testId, children }: { label: string; icon: string; value: ReactNode; sub?: ReactNode; testId?: string; children?: ReactNode }) {
  return (
    <section className="card flex flex-col gap-2 p-4" aria-label={label}>
      <div className="flex items-center justify-between text-label-lg text-text-secondary">
        <span>{label}</span>
        <Icon name={icon} size={20} />
      </div>
      <p className="font-mono text-[32px] font-bold leading-none tabular" data-testid={testId}>
        {value}
      </p>
      {sub && <div className="text-body-sm text-text-secondary">{sub}</div>}
      {children}
    </section>
  );
}
