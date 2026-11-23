'use client';

import { dateSchema, formatINR, type SlotDto } from '@/shared';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiError } from '../api/client';
import { useDailyMenu, useMe, usePlaceOrder, useSettings, useSlots } from '../api/hooks';
import { Alert, Button, Card, EmptyState, ErrorState, Icon, Pill, Skeleton, useToast } from '../components/ui';
import { useCart } from '../features/cart/CartContext';
import { linesOf, totals } from '../features/cart/cart';
import { addDays, formatDate } from '../lib/format';
import { formatLeft, istInstant, useServerClock, useServerNow } from '../lib/serverClock';

function slotLabel(s: SlotDto): string {
  return s.available ? `${s.capacity - s.booked} left` : `Full · ${s.booked}/${s.capacity}`;
}

/** Friendly inline message for an order error (US-09 AC2–AC8, US-19). */
function errorMessage(err: ApiError, cutoff: string | undefined): string {
  switch (err.code) {
    case 'CUTOFF_PASSED':
      return `${err.message}. Try ordering for tomorrow instead.`;
    case 'OUT_OF_STOCK':
      return `${err.message}. Reduce the quantity in your cart.`;
    case 'SLOT_FULL':
      return 'This slot just filled up. Pick another.';
    case 'ORDER_EXISTS_FOR_DATE':
      return 'You already have an order for this day. Cancel it to order again.';
    case 'NETWORK_ERROR':
      return err.message;
    default:
      return err.message || `Something went wrong. You can still order until ${cutoff ?? 'the cut-off'}.`;
  }
}

/** S4 Checkout + pickup slot (US-09, US-19). */
export function CheckoutPage() {
  const params = useSearchParams();
  const clock = useServerClock();
  const today = clock.today ?? '';
  const raw = params.get('date');
  const date = raw && dateSchema.safeParse(raw).success ? raw : today;
  const dayWord = !date ? '' : date === today ? 'today' : today && date === addDays(today, 1) ? 'tomorrow' : formatDate(date);

  const me = useMe().data?.user;
  const settings = useSettings().data;
  const menu = useDailyMenu(date);
  const slots = useSlots(date);
  const place = usePlaceOrder();
  const router = useRouter();
  const toast = useToast();
  const { cartFor, clear } = useCart();
  const [slot, setSlot] = useState<string | null>(null);
  const [key] = useState(() => crypto.randomUUID());

  const lines = useMemo(() => linesOf(cartFor(date), menu.data?.items ?? []), [cartFor, date, menu.data?.items]);
  const { count, totalPaise } = totals(lines);
  const serverNow = useServerNow(menu.data?.serverTime, menu.dataUpdatedAt);
  const msLeft = serverNow && menu.data ? istInstant(date, menu.data.cutoff).getTime() - serverNow.getTime() : null;
  const chosen = slots.data?.find((s) => s.start === slot);
  const error = place.error instanceof ApiError ? place.error : null;

  if (!date && clock.error) {
    return <div className="card"><ErrorState message="We couldn't load your order." onRetry={clock.retry} /></div>;
  }
  if (!date || menu.isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy="true" aria-label="Loading checkout">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40" />
        <Skeleton className="h-56" />
      </div>
    );
  }
  if (menu.isError) return <div className="card"><ErrorState message="We couldn't load your order." onRetry={() => void menu.refetch()} /></div>;
  if (count === 0 && !place.isSuccess) {
    return (
      <div className="card mx-auto max-w-lg">
        <EmptyState icon="shopping_basket" title="Your cart is empty" action={<Link href="/menu" className="inline-flex min-h-[44px] items-center rounded-btn bg-primary px-5 font-semibold text-white">Go to menu</Link>}>
          Add dishes from the menu first.
        </EmptyState>
      </div>
    );
  }

  function submit() {
    if (!slot) return;
    place.mutate(
      { body: { date, slotStart: slot, items: lines.map((l) => ({ dailyMenuItemId: l.id, qty: l.qty })) }, key },
      {
        onSuccess: (order) => {
          clear(date);
          toast.show('Order placed');
          router.replace(`/orders/${order.id}?new=1`);
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === 'SLOT_FULL') {
            setSlot(null);
            void slots.refetch();
          }
          if (err instanceof ApiError && err.code === 'OUT_OF_STOCK') void menu.refetch();
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={date === today ? '/menu' : '/menu?day=tomorrow'} className="inline-flex min-h-[44px] items-center gap-1 text-label-lg text-text-secondary hover:text-text-primary">
        <Icon name="arrow_back" size={20} /> Back to menu
      </Link>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-headline-xl-m md:text-headline-xl">Checkout</h1>
          <p className="text-body-md text-text-secondary">Menu → Checkout · Step 2 of 2</p>
        </div>
        {menu.data?.orderingOpen && msLeft !== null && (
          <Pill tone={msLeft < 10 * 60_000 ? 'error' : 'primary'} icon="timer" mono>
            Closes in {formatLeft(msLeft).replace(' left', '')}
          </Pill>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-headline-md">Order summary</h2>
              <Pill>{count} item{count === 1 ? '' : 's'}</Pill>
            </div>
            <ul className="mt-4 space-y-2">
              {lines.map((l) => (
                <li key={l.id} className="flex justify-between gap-3 text-body-lg">
                  <span>
                    <span className="font-mono tabular">{l.qty} ×</span> {l.name}
                  </span>
                  <span className="font-mono tabular">{formatINR(l.qty * l.pricePaise)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-dashed border-border-sand-strong pt-4">
              <div className="flex justify-between"><dt className="text-text-secondary">Subtotal</dt><dd className="font-mono tabular">{formatINR(totalPaise)}</dd></div>
              <div className="flex justify-between text-headline-sm"><dt>Total</dt><dd className="font-mono tabular">{formatINR(totalPaise)}</dd></div>
            </dl>
            <p className="mt-3 flex items-center gap-1.5 text-body-sm text-text-secondary">
              <Icon name="receipt_long" size={16} />
              Added to your monthly canteen statement{me?.employeeCode ? <> · <span className="font-mono">{me.employeeCode}</span></> : null}
            </p>
          </Card>

          <Card className="p-5">
            <fieldset>
              <legend className="text-headline-md">Pickup slot <span className="text-body-sm font-normal text-text-secondary">(IST)</span></legend>
              {slots.isPending ? (
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px]" />)}</div>
              ) : slots.isError ? (
                <ErrorState message="We couldn't load the pickup slots." onRetry={() => void slots.refetch()} />
              ) : (
                <div role="radiogroup" aria-label="Pickup slot" className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {slots.data.map((s) => {
                    const selected = s.start === slot;
                    return (
                      <button
                        key={s.start}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={`${s.start}–${s.end} · ${selected ? 'Your slot' : slotLabel(s)}`}
                        disabled={!s.available}
                        onClick={() => setSlot(s.start)}
                        className={[
                          'flex min-h-[72px] flex-col items-start justify-center rounded-tile border px-3 text-left transition-colors',
                          selected ? 'border-primary bg-primary text-white' : s.available ? 'border-border-sand-strong bg-white hover:border-primary' : 'cursor-not-allowed border-dashed border-border-sand-strong bg-surface-cream text-text-secondary',
                        ].join(' ')}
                      >
                        <span className={`font-mono text-ticket-code-sm tabular ${s.available ? '' : 'line-through'}`}>{s.start}–{s.end}</span>
                        <span className={`mt-0.5 flex items-center gap-1 text-body-sm ${selected ? 'text-white/90' : ''}`}>
                          {selected && <Icon name="check_circle" size={16} />}
                          {selected ? 'Your slot' : slotLabel(s)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </fieldset>
            {settings && (
              <p className="mt-4 flex items-start gap-1.5 text-body-sm text-text-secondary">
                <Icon name="info" size={16} />
                Arrive during your slot. Orders not collected within {settings.noShowGraceMinutes} minutes after the slot ends are marked as no-show and still billed.
              </p>
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="text-headline-sm">Your pickup</h2>
            <p className="mt-2 text-body-md">
              {chosen ? (
                <>
                  <span className="capitalize">{dayWord}</span> · <span className="font-mono tabular">{chosen.start}–{chosen.end}</span>
                  <br />
                  <span className="text-text-secondary">{menu.data?.pickupLocation}</span>
                </>
              ) : (
                <span className="text-text-secondary">Choose a pickup slot.</span>
              )}
            </p>
          </Card>
          {error && <Alert tone="error">{errorMessage(error, menu.data?.cutoff)}</Alert>}
          {!menu.data?.orderingOpen && !error && <Alert tone="warning" title={`Ordering for ${dayWord} closed at ${menu.data?.cutoff}`} />}
          <Button fullWidth size="lg" onClick={submit} loading={place.isPending} disabled={!slot || !menu.data?.orderingOpen}>
            Place order · {formatINR(totalPaise)}{slot ? ` · Slot ${slot}` : ''}
          </Button>
          <p className="text-center text-body-sm text-text-secondary">
            You can cancel until {menu.data?.cutoff} {dayWord}.
          </p>
        </aside>
      </div>
    </div>
  );
}
