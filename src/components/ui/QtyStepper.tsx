import { Icon } from './Icon';

/** Quantity stepper (UI spec §3): sand pill, white "−", terracotta "+", mono count; 44 px targets. */
export function QtyStepper({ name, qty, max, onChange, disabled = false }: { name: string; qty: number; max: number; onChange: (qty: number) => void; disabled?: boolean }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-border-sand p-1">
      <button
        type="button"
        aria-label={`Decrease ${name}`}
        disabled={disabled || qty <= 0}
        onClick={() => onChange(qty - 1)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-text-primary shadow-l1 disabled:opacity-40"
      >
        <Icon name="remove" size={20} />
      </button>
      <output aria-label={`Quantity of ${name}`} aria-live="polite" className="min-w-[2ch] text-center font-mono text-headline-sm tabular">
        {qty}
      </output>
      <button
        type="button"
        aria-label={`Increase ${name}`}
        disabled={disabled || qty >= max}
        onClick={() => onChange(qty + 1)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white disabled:bg-border-sand-strong disabled:text-text-secondary"
      >
        <Icon name="add" size={20} />
      </button>
    </div>
  );
}
