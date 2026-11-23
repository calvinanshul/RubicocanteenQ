import { Icon } from './Icon';

/** Text wordmark with icon (replaces the broken Stitch logo, D21). */
export function Wordmark({ subtitle, inverted = false }: { subtitle?: string; inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-btn ${inverted ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
        <Icon name="restaurant" size={20} filled />
      </span>
      <span className="leading-tight">
        <span className={`block text-headline-sm font-bold ${inverted ? 'text-white' : 'text-text-primary'}`}>CanteenQ</span>
        {subtitle && <span className={`block text-body-sm ${inverted ? 'text-white/80' : 'text-text-secondary'}`}>{subtitle}</span>}
      </span>
    </span>
  );
}
