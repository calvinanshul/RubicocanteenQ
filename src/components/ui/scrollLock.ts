import { useEffect } from 'react';

/* Shared page scroll lock: the loader and any number of dialogs can hold it at once. */
let holders = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

function lock() {
  if (holders++ > 0) return;
  const body = document.body;
  saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  // Keep the layout from shifting when the scrollbar disappears
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
  body.style.overflow = 'hidden';
}

function unlock() {
  if (--holders > 0 || !saved) return;
  document.body.style.overflow = saved.overflow;
  document.body.style.paddingRight = saved.paddingRight;
  saved = null;
}

/** Stops the page behind an overlay from scrolling while `active` is true. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
