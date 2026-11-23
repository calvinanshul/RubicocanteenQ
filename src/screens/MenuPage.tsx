'use client';

import { CATEGORY_LABELS, formatINR, type Category, type DailyMenuItemDto } from '@/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParamsState } from '@/lib/navigation';
import { useDailyMenu, useMe, useMyOrdersOn, useSettings } from '../api/hooks';
import { Alert, Button, Card, EmptyState, ErrorState, FilterChips, Icon, Pill, QtyStepper, SegmentedTabs, Skeleton } from '../components/ui';
import { useCart } from '../features/cart/CartContext';
import { linesOf, totals } from '../features/cart/cart';
import { DishCard } from '../features/ordering/DishCard';
import { addDays, formatDate } from '../lib/format';
import { formatLeft, istInstant, useServerClock, useServerNow } from '../lib/serverClock';

type Day = 'today' | 'tomorrow';
type Filter = 'ALL' | 'VEG' | 'NON_VEG' | Category;

function chipsFor(items: DailyMenuItemDto[]) {
  const veg = items.filter((i) => i.diet !== 'NON_VEG').length;
  const chips: { value: Filter; label: string; count: number }[] = [
    { value: 'ALL', label: 'All', count: items.length },
    { value: 'VEG', label: 'Veg', count: veg },
    { value: 'NON_VEG', label: 'Non-veg', count: items.length - veg },
  ];
  const cats = [...new Set(items.map((i) => i.category))];
  for (const c of cats) chips.push({ value: c, label: CATEGORY_LABELS[c].charAt(0) + CATEGORY_LABELS[c].slice(1).toLowerCase(), count: items.filter((i) => i.category === c).length });
  return chips.filter((c) => c.value === 'ALL' || c.count > 0);
}

function applyFilter(items: DailyMenuItemDto[], f: Filter) {
  if (f === 'ALL') return items;
  if (f === 'VEG') return items.filter((i) => i.diet !== 'NON_VEG');
  if (f === 'NON_VEG') return items.filter((i) => i.diet === 'NON_VEG');
  return items.filter((i) => i.category === f);
}

/** S3 Today's menu (US-08, US-09 cart). Mobile-first; desktop adds the "Your order" panel. */
export function MenuPage() {
  const [params, setParams] = useSearchParamsState();
  const day: Day = params.get('day') === 'tomorrow' ? 'tomorrow' : 'today';
  const setDay = (d: Day) => setParams(d === 'today' ? {} : { day: d }, { replace: true });
  // "Today" comes from the server clock, never the device (BUG-03-001); nothing loads until it's known
  const clock = useServerClock();
  const today = clock.today;
  const date = today ? (day === 'today' ? today : addDays(today, 1)) : '';

  const me = useMe().data?.user;
  const settings = useSettings().data;
  const menu = useDailyMenu(date, 30_000);
  const myOrders = useMyOrdersOn(date);
  const qc = useQueryClient();
  const router = useRouter();
  const { cartFor, setQty } = useCart();
  const [filter, setFilter] = useState<Filter>('ALL');
  useEffect(() => setFilter('ALL'), [date]);

  const data = menu.data;
  const serverNow = useServerNow(data?.serverTime, menu.dataUpdatedAt);
  const cutoffAt = data ? istInstant(date, data.cutoff) : null;
  const msLeft = serverNow && cutoffAt ? cutoffAt.getTime() - serverNow.getTime() : null;
  // When the countdown runs out, ask the server again so the page switches to "closed" (BR1)
  useEffect(() => {
    if (data?.orderingOpen && msLeft !== null && msLeft <= 0) void qc.invalidateQueries({ queryKey: ['daily-menu', date] });
  }, [data?.orderingOpen, msLeft, qc, date]);

  const activeOrder = myOrders.data?.items.find((o) => o.status !== 'CANCELLED');
  const orderingDisabled = !data?.orderingOpen || Boolean(activeOrder);
  const maxQty = settings?.maxQtyPerItem ?? 5;
  const cart = cartFor(date);
  const lines = useMemo(() => linesOf(cart, data?.items ?? []), [cart, data?.items]);
  const { count, totalPaise } = totals(lines);
  const items = data?.items ?? [];
  const visible = applyFilter(items, filter);
  const firstName = me?.name.split(' ')[0];

  const goCheckout = () => router.push(`/menu/checkout?date=${date}`);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
      <div className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-body-md text-text-secondary">{firstName ? `Hi ${firstName} · ` : ''}{date ? formatDate(date) : ''}</p>
            <h1 className="text-headline-xl-m md:text-headline-xl">{day === 'today' ? "Today's menu" : "Tomorrow's menu"}</h1>
          </div>
          <SegmentedTabs
            label="Menu day"
            value={day}
            onChange={setDay}
            options={[
              { value: 'today', label: 'Today', icon: 'today' },
              { value: 'tomorrow', label: 'Tomorrow', icon: 'event' },
            ]}
          />
        </div>

        <div className="mt-5 space-y-3">
          {data && !data.closed && (
            <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
              <div className="flex items-center gap-2">
                <Icon name="schedule" className="text-primary" />
                <span className="text-label-lg">Order before {data.cutoff}</span>
                {data.orderingOpen && msLeft !== null && (
                  <Pill tone={msLeft < 10 * 60_000 ? 'error' : 'primary'} mono>
                    {formatLeft(msLeft)}
                  </Pill>
                )}
              </div>
              {settings && (
                <span className="flex items-center gap-1.5 text-body-md text-text-secondary">
                  <Icon name="storefront" size={18} />
                  Pickup <span className="font-mono tabular">{settings.slotStart}–{settings.slotEnd}</span> · {data.pickupLocation}
                </span>
              )}
            </Card>
          )}
          {data && !data.closed && !data.orderingOpen && (
            <Alert
              tone="warning"
              title={`Ordering for ${day === 'today' ? 'today' : formatDate(date)} closed at ${data.cutoff}`}
              action={day === 'today' ? <Button variant="secondary" onClick={() => setDay('tomorrow')}>Order for tomorrow</Button> : undefined}
            >
              {day === 'today' ? 'You can still order lunch for tomorrow.' : null}
            </Alert>
          )}
          {activeOrder && (
            <Alert
              tone="info"
              title={`You already have an order for ${day === 'today' ? 'today' : 'tomorrow'}.`}
              action={
                <Link href={`/orders/${activeOrder.id}`} className="inline-flex min-h-[44px] items-center gap-1 rounded-btn px-3 text-label-lg font-semibold text-primary-active hover:underline">
                  View <Icon name="arrow_forward" size={18} />
                </Link>
              }
            >
              Cancel it before the cut-off if you want to order something else.
            </Alert>
          )}
        </div>

        {clock.error ? (
          <div className="card mt-6"><ErrorState message="We couldn't load the menu." onRetry={clock.retry} /></div>
        ) : menu.isPending ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading menu">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}
          </div>
        ) : menu.isError ? (
          <div className="card mt-6"><ErrorState message="We couldn't load the menu." onRetry={() => void menu.refetch()} /></div>
        ) : data === null ? (
          <div className="card mt-6">
            <EmptyState icon="menu_book" title={`${day === 'today' ? "Today's" : "Tomorrow's"} menu isn't published yet`}>Check back soon.</EmptyState>
          </div>
        ) : data?.closed ? (
          <div className="card mt-6">
            <EmptyState icon="event_busy" title="The canteen is closed on this day" action={day === 'today' ? <Button variant="secondary" onClick={() => setDay('tomorrow')}>See tomorrow</Button> : undefined} />
          </div>
        ) : (
          <>
            <div className="mt-6">
              <FilterChips label="Filter dishes" chips={chipsFor(items)} value={filter} onChange={setFilter} />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {visible.map((item) => (
                <DishCard
                  key={item.dailyMenuItemId}
                  item={item}
                  qty={cart[item.dailyMenuItemId] ?? 0}
                  max={Math.min(maxQty, item.remaining)}
                  orderingDisabled={orderingDisabled}
                  onQty={(q) => setQty(date, item.dailyMenuItemId, q, Math.min(maxQty, item.remaining))}
                />
              ))}
            </div>
            {visible.length === 0 && <p className="mt-6 text-text-secondary">No dishes match this filter.</p>}
          </>
        )}
      </div>

      {/* Desktop: "Your order" panel stays in view */}
      <aside className="hidden lg:block" aria-label="Your order">
        <div className="card sticky top-24 p-5">
          <h2 className="text-headline-md">Your order</h2>
          {lines.length === 0 ? (
            <p className="mt-3 text-body-md text-text-secondary">Add dishes from the menu to start your order.</p>
          ) : (
            <>
              <ul className="mt-4 space-y-3">
                {lines.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-label-lg">{l.name}</p>
                      <p className="font-mono text-body-sm text-text-secondary tabular">{formatINR(l.pricePaise * l.qty)}</p>
                    </div>
                    <QtyStepper
                      name={l.name}
                      qty={l.qty}
                      max={Math.min(maxQty, items.find((i) => i.dailyMenuItemId === l.id)?.remaining ?? 0)}
                      disabled={orderingDisabled}
                      onChange={(q) => setQty(date, l.id, q, Math.min(maxQty, items.find((i) => i.dailyMenuItemId === l.id)?.remaining ?? 0))}
                    />
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1 border-t border-dashed border-border-sand-strong pt-4">
                <div className="flex justify-between text-body-md"><dt className="text-text-secondary">Subtotal</dt><dd className="font-mono tabular">{formatINR(totalPaise)}</dd></div>
                <div className="flex justify-between text-headline-sm"><dt>Total</dt><dd className="font-mono tabular">{formatINR(totalPaise)}</dd></div>
              </dl>
              <p className="mt-2 text-body-sm text-text-secondary">Added to your monthly canteen statement</p>
            </>
          )}
          <Button fullWidth size="lg" className="mt-5" icon="schedule" disabled={lines.length === 0 || orderingDisabled} onClick={goCheckout}>
            Choose pickup slot
          </Button>
        </div>
      </aside>

      {/* Mobile: floating cart tray above the bottom nav */}
      {count > 0 && !orderingDisabled && (
        <div className="fixed inset-x-4 bottom-[76px] z-20 lg:hidden">
          <button
            type="button"
            onClick={goCheckout}
            className="flex min-h-[56px] w-full items-center gap-3 rounded-card bg-text-primary px-4 text-left text-white shadow-l3"
          >
            <span className="flex-1 truncate">
              <span className="font-semibold">{count} item{count === 1 ? '' : 's'}</span>
              <span className="font-mono tabular"> · {formatINR(totalPaise)}</span>
              <span className="text-white/75"> · {lines.map((l) => l.name).join(', ')}</span>
            </span>
            <span className="flex items-center gap-1 font-semibold">Checkout <Icon name="arrow_forward" size={18} /></span>
          </button>
        </div>
      )}
      {count > 0 && !orderingDisabled && <div className="h-20 lg:hidden" aria-hidden="true" />}
    </div>
  );
}
