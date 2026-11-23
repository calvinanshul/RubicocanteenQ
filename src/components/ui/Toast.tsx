import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
}
const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const TONE: Record<ToastTone, { cls: string; icon: string }> = {
  success: { cls: 'bg-text-primary text-white', icon: 'check_circle' },
  error: { cls: 'bg-error text-white', icon: 'error' },
  info: { cls: 'bg-text-primary text-white', icon: 'info' },
};

/** Toasts: bottom on phone, top-right on desktop; announced via aria-live. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const show = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextId.current++;
    setItems((list) => [...list, { id, tone, message }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);
  const value = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex flex-col items-center gap-2 md:inset-x-auto md:bottom-auto md:right-6 md:top-6 md:items-end">
        {items.map((t) => (
          <div key={t.id} role="status" className={`pointer-events-auto flex items-center gap-2 rounded-tile px-4 py-3 text-label-lg shadow-l3 ${TONE[t.tone].cls}`}>
            <Icon name={TONE[t.tone].icon} size={20} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
