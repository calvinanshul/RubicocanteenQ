import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useScrollLock } from './scrollLock';

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  icon?: string;
}

/** Modal dialog: centered over a blurred, scroll-locked page; traps focus, closes on Esc and scrim click, restores focus on close. */
export function Dialog({ open, title, onClose, children, footer, icon }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter(
        (el) => !el.hasAttribute('disabled'),
      );
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const els = focusables();
        const first = els[0];
        const last = els[els.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;
  // Portal to <body>: a transformed ancestor (page animations) would otherwise pin `fixed` to that ancestor
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-[rgba(43,33,27,0.35)] p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className="my-auto w-full max-w-lg overflow-hidden rounded-dialog bg-white shadow-l3">
        <div className="flex items-center gap-3 px-5 py-4">
          {icon && (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-tile bg-primary-tint text-primary">
              <Icon name={icon} />
            </span>
          )}
          <h2 id={titleId} className="flex-1 text-headline-md">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-btn hover:bg-border-sand">
            <Icon name="close" />
          </button>
        </div>
        <div className="px-5 pb-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border-sand bg-surface-card-warm px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
