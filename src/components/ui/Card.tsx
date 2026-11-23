import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function SectionCard({ title, actions, children, className = '' }: { title: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-headline-md">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Ticket: warm card with dashed separators between header / items / footer. */
export function Ticket({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border-[1.5px] border-border-sand-strong bg-surface-card-warm [&>*+*]:border-t [&>*+*]:border-dashed [&>*+*]:border-border-sand-strong ${className}`}>
      {children}
    </div>
  );
}
