import { useRef, type KeyboardEvent } from 'react';
import { Icon } from './Icon';

export interface TabOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

/** Segmented tabs (Today / Tomorrow): sand track, terracotta selected segment; arrow keys move between tabs. */
export function SegmentedTabs<T extends string>({ options, value, onChange, label }: { options: TabOption<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKey(e: KeyboardEvent, i: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = (i + (e.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length;
    const option = options[next];
    if (option) {
      onChange(option.value);
      refs.current[next]?.focus();
    }
  }
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-full bg-border-sand p-1">
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-label-lg transition-colors ${selected ? 'bg-primary text-white shadow-l1' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {o.icon && <Icon name={o.icon} size={18} filled={selected} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
