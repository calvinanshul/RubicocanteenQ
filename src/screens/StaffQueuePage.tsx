'use client';

import type { QueueDto, StaffOrderDto } from '@/shared';
import { useState } from 'react';
import { ApiError } from '../api/client';
import { useQueue, useSetStatus } from '../api/hooks';
import { Alert, Button, DietMarker, EmptyState, ErrorState, FilterChips, Icon, Pill, Skeleton, StatusBadge, useToast } from '../components/ui';
import { formatDate } from '../lib/format';
import { timeIST } from '../lib/serverClock';

type Tab = 'ALL' | 'PLACED' | 'PREPARING' | 'READY' | 'COLLECTED' | 'ISSUES';

function matches(o: StaffOrderDto, tab: Tab): boolean {
  if (tab === 'ALL') return true;
  if (tab === 'ISSUES') return o.status === 'CANCELLED' || o.status === 'NO_SHOW';
  return o.status === tab;
}

/** The slot being served now: the one containing server time, else the next one, else the last. */
function currentSlot(q: QueueDto): string | null {
  const now = timeIST(q.serverTime);
  const starts = q.slots.map((s) => s);
  return (starts.find((s) => s.start <= now && now < s.end) ?? starts.find((s) => s.start > now) ?? starts[starts.length - 1])?.start ?? null;
}

function OrderTicket({ order, onAction, busy }: { order: StaffOrderDto; onAction: (status: 'PREPARING' | 'READY') => void; busy: boolean }) {
  const inactive = order.status === 'CANCELLED' || order.status === 'NO_SHOW';
  return (
    <article
      aria-label={`Order ${order.pickupCode}`}
      className={`rounded-tile border-[1.5px] border-border-sand-strong bg-surface-card-warm ${inactive ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className={`font-mono text-headline-md tracking-widest tabular ${inactive ? 'line-through' : ''}`}>{order.pickupCode}</p>
          <p className="truncate text-body-md text-text-secondary">
            {order.employeeName}
            {order.department ? ` · ${order.department}` : ''}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <ul className="space-y-1 border-t border-dashed border-border-sand-strong px-3 py-2">
        {order.items.map((i) => (
          <li key={i.name} className="flex items-center gap-2 text-body-md">
            {i.diet && <DietMarker diet={i.diet} />}
            <span className="font-mono tabular">{i.qty} ×</span> {i.name}
          </li>
        ))}
      </ul>
      {(order.status === 'PLACED' || order.status === 'PREPARING') && (
        <div className="border-t border-dashed border-border-sand-strong p-3">
          {order.status === 'PLACED' ? (
            <Button fullWidth variant="tint" icon="skillet" loading={busy} onClick={() => onAction('PREPARING')}>Start preparing</Button>
          ) : (
            <Button fullWidth icon="check_circle" loading={busy} onClick={() => onAction('READY')}>Mark ready</Button>
          )}
        </div>
      )}
      {order.status === 'COLLECTED' && order.collectedAt && (
        <p className="border-t border-dashed border-border-sand-strong px-3 py-2 text-body-sm text-text-secondary">Collected at {timeIST(order.collectedAt)}</p>
      )}
    </article>
  );
}

/** S7 Order queue (US-12): today's orders by slot, Start / Mark ready; READY waits for the scan. */
export function StaffQueuePage() {
  const queue = useQueue();
  const setStatus = useSetStatus();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('ALL');
  const [busyId, setBusyId] = useState<number | null>(null);

  function act(id: number, status: 'PREPARING' | 'READY') {
    setBusyId(id);
    setStatus.mutate(
      { id, status },
      {
        onError: (err) => toast.show(err instanceof ApiError ? err.message : 'Could not update the order', 'error'),
        onSettled: () => setBusyId(null),
      },
    );
  }

  const q = queue.data;
  const counts = q?.counts;
  const now = q ? currentSlot(q) : null;
  const slots = q?.slots.map((s) => ({ ...s, orders: s.orders.filter((o) => matches(o, tab)) })).filter((s) => s.orders.length > 0) ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-headline-xl-m md:text-headline-xl">Today's orders</h1>
          <p className="text-body-md text-text-secondary">
            {q ? formatDate(q.date) : ''} · Updates every 15 s{q ? ` · Last updated ${timeIST(q.lastUpdated)}` : ''}
          </p>
        </div>
      </div>

      {counts && (
        <div className="mt-4">
          <FilterChips
            label="Filter by status"
            value={tab}
            onChange={setTab}
            chips={[
              { value: 'ALL', label: 'All', count: counts.ALL },
              { value: 'PLACED', label: 'Placed', count: counts.PLACED },
              { value: 'PREPARING', label: 'Preparing', count: counts.PREPARING },
              { value: 'READY', label: 'Ready', count: counts.READY },
              { value: 'COLLECTED', label: 'Collected', count: counts.COLLECTED },
              { value: 'ISSUES', label: 'Issues', count: counts.CANCELLED + counts.NO_SHOW },
            ]}
          />
        </div>
      )}

      {queue.isPending ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading orders">
          {[0, 1].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : queue.isError ? (
        <div className="card mt-6"><ErrorState message="We couldn't load the orders." onRetry={() => void queue.refetch()} /></div>
      ) : slots.length === 0 ? (
        <div className="card mt-6">
          <EmptyState icon="inbox" title={tab === 'ALL' ? 'No orders for today yet' : 'No orders with this status'} />
        </div>
      ) : (
        <div className="mt-6 grid items-start gap-4 md:grid-cols-2">
          {slots.map((s) => {
            const serving = s.start === now;
            return (
              <section key={s.start} aria-label={`Slot ${s.start}–${s.end}`} className={`card overflow-hidden ${serving ? 'ring-2 ring-primary' : ''}`}>
                <header className={`flex items-center justify-between px-4 py-3 ${serving ? 'bg-primary text-white' : 'bg-white'}`}>
                  <h2 className="flex items-center gap-2 font-mono text-headline-md tabular">
                    <Icon name="schedule" size={20} />
                    {s.start}–{s.end}
                  </h2>
                  <span className="flex items-center gap-2">
                    {serving && <span className="text-label-lg">Now serving</span>}
                    <Pill tone={serving ? 'selected' : 'neutral'} mono>{s.orders.length}</Pill>
                  </span>
                </header>
                <div className="space-y-3 p-3">
                  {s.orders.map((o) => (
                    <OrderTicket key={o.id} order={o} busy={busyId === o.id} onAction={(st) => act(o.id, st)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {setStatus.error instanceof ApiError && setStatus.error.code === 'NETWORK_ERROR' && (
        <div className="mt-4"><Alert tone="error">{setStatus.error.message}</Alert></div>
      )}
    </div>
  );
}
