'use client';

import { formatINR } from '@/shared';
import Link from 'next/link';
import { useSearchParamsState } from '@/lib/navigation';
import { dateSchema } from '@/shared';
import { useDashboard, useMe } from '../api/hooks';
import { DietMarker, EmptyState, ErrorState, Icon, KpiTile, Pill, ProgressBar, Skeleton } from '../components/ui';
import { formatDate } from '../lib/format';
import { useServerClock } from '../lib/serverClock';
import { timeIST } from '../lib/serverClock';

/** S10 Dashboard (US-14, D14–D18). Admin sees the same data, read-only. Polled every 30 s. */
export function DashboardPage() {
  const me = useMe().data?.user;
  const [params, setParams] = useSearchParamsState();
  const raw = params.get('date');
  const date = raw && dateSchema.safeParse(raw).success ? raw : undefined;
  const dash = useDashboard(date);
  const clock = useServerClock();
  const d = dash.data;
  const isManager = me?.role === 'MANAGER';
  const k = d?.kpis;
  const empty = k?.orders === 0;
  const maxSlot = Math.max(1, ...(d?.slots.map((s) => s.count) ?? [0]));

  return (
    <div className="space-y-6">
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h1 className="text-headline-lg">Canteen overview</h1>
          <p className="flex flex-wrap items-center gap-2 text-body-md text-text-secondary">
            {d ? formatDate(d.date, true) : ''}
            {d && <Pill tone="success" icon="sync">Auto-refresh · updated {timeIST(d.lastUpdated)}</Pill>}
            {!isManager && <Pill icon="visibility">Read-only</Pill>}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="dash-date" className="mb-1 block text-label-md text-text-secondary">Date</label>
            <input
              id="dash-date"
              type="date"
              value={d?.date ?? date ?? clock.today ?? ''}
              onChange={(e) => e.target.value && setParams({ date: e.target.value }, { replace: true })}
              className="min-h-[44px] rounded-btn border border-border-sand-strong bg-white px-3"
            />
          </div>
          <Link href="/manager/exports" className="inline-flex min-h-[44px] items-center gap-2 rounded-btn bg-primary px-4 text-label-lg font-semibold text-white hover:bg-primary-hover">
            <Icon name="download" size={20} /> Export CSV
          </Link>
        </div>
      </section>

      {dash.isPending ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6" aria-busy="true" aria-label="Loading dashboard">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : dash.isError || !d || !k ? (
        <div className="card"><ErrorState message="We couldn't load the dashboard." onRetry={() => void dash.refetch()} /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <KpiTile label="Total orders" icon="receipt_long" value={k.orders} testId="kpi-orders"
              sub={k.vsYesterdayPct === null ? 'No orders on the previous day' : `${k.vsYesterdayPct >= 0 ? '+' : ''}${k.vsYesterdayPct}% vs previous day`} />
            <KpiTile label="Revenue" icon="payments" value={formatINR(k.revenuePaise)} testId="kpi-revenue" sub={`Avg ${formatINR(k.avgOrderPaise)}/order`} />
            <KpiTile label="Collected" icon="done_all" value={k.collected} testId="kpi-collected" sub={`${k.collectedPct}% of orders`}>
              <ProgressBar value={k.collected} max={Math.max(1, k.orders)} label={`Collected ${k.collectedPct}%`} tone="success" />
            </KpiTile>
            <KpiTile label="Pending" icon="hourglass_top" value={k.pending} testId="kpi-pending" sub="Placed, preparing or ready" />
            <KpiTile label="Cancelled" icon="block" value={k.cancelled} testId="kpi-cancelled" sub={k.orders ? `${Math.round((k.cancelled / k.orders) * 1000) / 10}% of orders` : '—'} />
            <KpiTile label="No-show" icon="person_off" value={k.noShow} testId="kpi-noshow" sub="Billed to the statement" />
          </div>

          {empty && (
            <div className="card"><EmptyState icon="event_note" title="No orders for this date" /></div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5" aria-label="Items to prepare">
              <h2 className="text-headline-md">Items to prepare</h2>
              {d.items.length === 0 ? (
                <p className="mt-3 text-text-secondary">No menu for this date.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {d.items.map((i) => (
                    <li key={i.name}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-headline-sm"><DietMarker diet={i.diet} /> {i.name}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-body-md tabular">{i.ordered}/{i.quantity}</span>
                          {i.soldOut ? <Pill tone="error">Sold out</Pill> : <Pill tone={i.remaining <= 5 ? 'warning' : 'success'}>{i.remaining} left</Pill>}
                        </span>
                      </div>
                      <div className="mt-1.5"><ProgressBar value={i.ordered} max={i.quantity} label={`${i.name} ordered`} tone={i.soldOut ? 'error' : 'primary'} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card p-5" aria-label="Pickup slots">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-md">Pickup slots</h2>
                {d.peakSlot && <Pill tone="primary" icon="trending_up">Busiest {d.peakSlot}</Pill>}
              </div>
              <ul className="mt-4 space-y-2">
                {d.slots.map((s) => {
                  const peak = s.start === d.peakSlot;
                  return (
                    <li key={s.start} className="grid grid-cols-[52px_1fr_40px] items-center gap-3">
                      <span className="font-mono text-body-sm tabular">{s.start}</span>
                      <span className="h-5 overflow-hidden rounded-full bg-border-sand" aria-hidden="true">
                        <span className={`block h-full rounded-full ${peak ? 'bg-primary' : 'bg-chart-bar'}`} style={{ width: `${(s.count / maxSlot) * 100}%` }} />
                      </span>
                      <span className="text-right font-mono text-body-sm tabular" aria-label={`${s.start}: ${s.count} orders`}>{s.count}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-body-sm text-text-secondary">
                Capacity {d.capacityPerSlot} per slot · {d.slots.some((s) => s.count >= d.capacityPerSlot) ? 'Some slots are full' : 'No full slots'}
              </p>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
