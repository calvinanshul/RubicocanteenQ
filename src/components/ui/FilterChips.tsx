export interface Chip<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** Filter chips, with optional counts; selected chip is terracotta. */
export function FilterChips<T extends string>({ chips, value, onChange, label }: { chips: Chip<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
      {chips.map((c) => {
        const selected = c.value === value;
        return (
          <button
            key={c.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(c.value)}
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-4 text-label-lg ${selected ? 'border-primary bg-primary text-white' : 'border-border-sand-strong bg-white text-text-primary hover:bg-surface-card-warm'}`}
          >
            {c.label}
            {c.count !== undefined && <span className={`font-mono text-label-md tabular ${selected ? 'text-white/85' : 'text-text-secondary'}`}>{c.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
