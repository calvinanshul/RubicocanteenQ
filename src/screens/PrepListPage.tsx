'use client';

import { usePrepList, useQueue } from '../api/hooks';
import { Button, DietMarker, DishTile, EmptyState, ErrorState, ProgressBar, Skeleton } from '../components/ui';
import { formatDate } from '../lib/format';
import { useServerClock } from '../lib/serverClock';

/** S9 Prep list (US-12 AC6): portions to cook per dish, cancelled orders excluded; readable from 2 m; printable. */
export function PrepListPage() {
  const prep = usePrepList();
  const queue = useQueue();
  const serverToday = useServerClock().today;
  const date = queue.data?.date ?? serverToday;
  const total = prep.data?.reduce((s, i) => s + i.qty, 0) ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-headline-xl-m md:text-headline-xl">Prep list{date ? ` · ${formatDate(date)}` : ''}</h1>
          <p className="text-body-md text-text-secondary">Totals exclude cancelled orders.</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-headline-md">
            Total <span className="font-mono tabular">{total}</span> portions
          </p>
          <Button variant="secondary" icon="print" onClick={() => window.print()} className="print:hidden">Print</Button>
        </div>
      </div>

      {prep.isPending ? (
        <div className="mt-6 grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48" />)}</div>
      ) : prep.isError ? (
        <div className="card mt-6"><ErrorState message="We couldn't load the prep list." onRetry={() => void prep.refetch()} /></div>
      ) : prep.data.length === 0 ? (
        <div className="card mt-6"><EmptyState icon="menu_book" title="No menu for today" /></div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3">
          {prep.data.map((i) => (
            <section
              key={i.name}
              aria-label={i.name}
              className={`flex flex-col gap-3 rounded-card border p-5 shadow-l1 ${i.soldOut ? 'border-warning-border bg-warning-bg' : 'border-border-sand bg-surface-card'}`}
            >
              <div className="flex items-center gap-3">
                <DishTile name={i.name} category={i.category} size={44} />
                <h2 className="flex items-center gap-2 text-headline-sm">
                  <DietMarker diet={i.diet} /> {i.name}
                </h2>
              </div>
              <p>
                <span className="font-mono text-[52px] font-bold leading-none tabular">{i.qty}</span>
                <span className="ml-2 text-body-md text-text-secondary">of {i.quantity} portions</span>
              </p>
              <ProgressBar value={i.qty} max={i.quantity} label={`${i.name}: ${i.qty} of ${i.quantity}`} tone={i.soldOut ? 'error' : 'primary'} />
              <p className={`text-label-lg ${i.soldOut ? 'text-warning-text' : 'text-text-secondary'}`}>
                {i.soldOut ? 'Sold out' : `${i.quantity - i.qty} unsold`}
              </p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
