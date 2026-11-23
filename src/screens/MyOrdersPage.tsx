'use client';

import { formatINR, type OrderDto } from '@/shared';
import Link from 'next/link';
import { useMyOrders } from '../api/hooks';
import { Button, EmptyState, ErrorState, Icon, Skeleton, StatusBadge } from '../components/ui';
import { formatDate, todayIST } from '../lib/format';
import { timeIST } from '../lib/serverClock';

const LIVE = new Set(['PLACED', 'PREPARING', 'READY']);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function itemsText(o: OrderDto): string {
  return o.items.map((i) => `${i.qty} × ${i.name}`).join(', ');
}

function GoToMenu({ label = 'Go to menu' }: { label?: string }) {
  return (
    <Link href="/menu" className="inline-flex min-h-[44px] items-center gap-2 rounded-btn bg-primary px-5 text-label-lg font-semibold text-white hover:bg-primary-hover">
      <Icon name="restaurant_menu" size={20} /> {label}
    </Link>
  );
}

/** Today's (or tomorrow's) order that is still in progress: a shortcut to the pass. */
function ActiveOrderCard({ order }: { order: OrderDto }) {
  return (
    <Link
      href={`/orders/${order.id}`}
      aria-label={`Active order ${order.pickupCode}, open pass`}
      className="card flex items-center gap-4 border-[1.5px] border-primary-fixed p-4 hover:bg-surface-card-warm"
    >
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-tile bg-primary-tint text-primary">
        <Icon name="qr_code_2" size={28} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          <span className="text-body-md text-text-secondary">
            {formatDate(order.date)} · <span className="font-mono">{order.slotStart}–{order.slotEnd}</span>
          </span>
        </div>
        <p className="mt-1 truncate text-body-lg">{itemsText(order)}</p>
      </div>
      <span className="font-mono text-headline-md tracking-widest tabular">{order.pickupCode}</span>
      <Icon name="chevron_right" />
    </Link>
  );
}

/** S6 My orders (US-11 AC3/AC5): active order, this month's statement total, history 10 at a time. */
export function MyOrdersPage() {
  const query = useMyOrders();
  const pages = query.data?.pages ?? [];
  const orders = pages.flatMap((p) => p.items);
  const summary = pages[0]?.summary;
  const total = pages[0]?.total ?? 0;
  // Server time, never the device clock (BR1): an order still open from an earlier day is not "active"
  const active = orders.find((o) => LIVE.has(o.status) && Boolean(o.serverTime) && o.date >= todayIST(new Date(o.serverTime)));
  const monthName = summary ? MONTHS[Number(summary.month.slice(5, 7)) - 1] : '';

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-headline-xl-m md:text-headline-xl">My orders</h1>
        {orders.length > 0 && <GoToMenu label="Order lunch" />}
      </div>

      {query.isPending ? (
        <div className="mt-6 space-y-3" aria-busy="true" aria-label="Loading orders">
          <Skeleton className="h-20" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : query.isError ? (
        <div className="card mt-6"><ErrorState message="We couldn't load your orders." onRetry={() => void query.refetch()} /></div>
      ) : orders.length === 0 ? (
        <div className="card mt-6">
          <EmptyState icon="receipt_long" title="No orders yet" action={<GoToMenu />}>
            Your lunch orders and pickup passes will show here.
          </EmptyState>
        </div>
      ) : (
        <>
          {active && (
            <section aria-label="Active order" className="mt-6">
              <ActiveOrderCard order={active} />
            </section>
          )}

          {summary && (
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div className="card p-4">
                <dt className="text-label-md text-text-secondary">Orders in {monthName}</dt>
                <dd className="mt-1 font-mono text-headline-lg tabular">{summary.orders}</dd>
              </div>
              <div className="card p-4">
                <dt className="text-label-md text-text-secondary">On statement</dt>
                <dd className="mt-1 font-mono text-headline-lg tabular">{formatINR(summary.totalPaise)}</dd>
              </div>
            </dl>
          )}

          <section aria-label="Order history" className="mt-6">
            <h2 className="text-headline-md">History</h2>

            {/* Phone: cards */}
            <ul className="mt-3 space-y-3 md:hidden">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="card block p-4 hover:bg-surface-card-warm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-label-lg">{formatDate(o.date)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="mt-1 text-body-md text-text-secondary">{itemsText(o)}</p>
                    <p className="mt-1 font-mono text-body-lg tabular">{formatINR(o.totalPaise)}</p>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="card mt-3 hidden overflow-x-auto md:block">
              <table className="w-full text-left text-body-md">
                <thead className="bg-surface-cream text-label-md uppercase tracking-wider text-text-secondary">
                  <tr>
                    <th scope="col" className="px-4 py-3">Date</th>
                    <th scope="col" className="px-4 py-3">Items</th>
                    <th scope="col" className="px-4 py-3">Slot</th>
                    <th scope="col" className="px-4 py-3 text-right">Total</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Collected at</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t border-border-sand">
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link href={`/orders/${o.id}`} className="text-label-lg underline-offset-2 hover:underline">{formatDate(o.date, true)}</Link>
                      </td>
                      <td className="px-4 py-3">{itemsText(o)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono">{o.slotStart}–{o.slotEnd}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular">{formatINR(o.totalPaise)}</td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 font-mono">{o.collectedAt ? timeIST(o.collectedAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-body-sm text-text-secondary">Showing {orders.length} of {total}</p>
              {query.hasNextPage && (
                <Button variant="secondary" icon="expand_more" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
                  Load more
                </Button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
