/** Progress bar: 6–8 px sand track, terracotta fill (red when full/sold out). */
export function ProgressBar({ value, max, label, tone = 'primary' }: { value: number; max: number; label: string; tone?: 'primary' | 'error' | 'success' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const fill = tone === 'error' ? 'bg-error' : tone === 'success' ? 'bg-veg' : 'bg-primary';
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-2 w-full overflow-hidden rounded-full bg-border-sand">
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
