'use client';

import { formatINR } from '@/shared';
import { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ApiError } from '../api/client';
import { useCancelOrder, useMe, useOrder } from '../api/hooks';
import { Alert, Button, Card, Dialog, EmptyState, ErrorState, Icon, Pill, Skeleton, StatusBadge, StatusStepper, SuccessCheck, Ticket, useToast } from '../components/ui';
import { formatDate, todayIST } from '../lib/format';
import { formatIn, istInstant, timeIST, useServerNow } from '../lib/serverClock';

const FINAL = new Set(['COLLECTED', 'CANCELLED', 'NO_SHOW']);

/** S5 Order pass / QR (US-10, US-11, D11–D13). Polls every 20 s while the order can change. */
export function OrderPassPage() {
  const id = Number(useParams<{ id: string }>().id);
  const params = useSearchParams();
  const isNew = params.get('new') === '1';
  const me = useMe().data?.user;
  const order = useOrder(id);
  const cancel = useCancelOrder(id);
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const o = order.data;
  const serverNow = useServerNow(o?.serverTime, order.dataUpdatedAt, 30_000);

  if (!Number.isInteger(id) || id <= 0 || (order.error instanceof ApiError && order.error.status === 404)) {
    return (
      <div className="card mx-auto max-w-lg">
        <EmptyState icon="search_off" title="Order not found" action={<Link href="/menu" className="inline-flex min-h-[44px] items-center rounded-btn bg-primary px-5 font-semibold text-white">Go to menu</Link>} />
      </div>
    );
  }
  if (order.isPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-4" aria-busy="true" aria-label="Loading order">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (order.isError || !o) return <div className="card"><ErrorState message="We couldn't load this order." onRetry={() => void order.refetch()} /></div>;

  const slotStartAt = istInstant(o.date, o.slotStart);
  const msToSlot = serverNow ? slotStartAt.getTime() - serverNow.getTime() : null;
  const live = !FINAL.has(o.status);
  const isToday = serverNow ? o.date === todayIST(serverNow) : false;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(o?.pickupCode ?? '');
      toast.show('Pickup code copied');
    } catch {
      toast.show('Copy failed. Read the code from the screen.', 'error');
    }
  }

  function confirmCancel() {
    cancel.mutate(undefined, {
      onSuccess: () => {
        setConfirming(false);
        toast.show('Order cancelled');
      },
      onError: () => setConfirming(false),
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-3">
        {isNew && o.status !== 'CANCELLED' && <SuccessCheck size={88} className="-my-2" />}
        <div>
          <h1 className="text-headline-xl-m md:text-headline-xl">{isNew && o.status !== 'CANCELLED' ? 'Order confirmed' : `Order #${o.id}`}</h1>
          <p className="text-body-md text-text-secondary">
            {formatDate(o.date, true)} · Order #{o.id}
          </p>
        </div>
      </div>

      {/* Phone: status → window → QR ticket → summary. Desktop: status + summary left, ticket right (UI spec S5). */}
      <div className="mt-6 grid gap-4 [grid-template-areas:'top'_'ticket'_'bottom'] lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-x-6 lg:[grid-template-areas:'top_ticket'_'bottom_ticket']">
        <div className="space-y-4 [grid-area:top]">
          <Card className="p-5">
            {o.status === 'CANCELLED' || o.status === 'NO_SHOW' ? (
              <div className="flex items-center gap-3">
                <StatusBadge status={o.status} />
                <span className="text-body-md text-text-secondary">
                  {o.status === 'CANCELLED' ? 'This order was cancelled. The items went back on the menu.' : 'This order was not collected in time.'}
                </span>
              </div>
            ) : (
              <StatusStepper status={o.status} />
            )}
          </Card>

          {o.status === 'READY' && (
            <Alert tone="success" title="Your lunch is ready!">
              Show this pass at {o.pickupLocation}.
            </Alert>
          )}

          {live && (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="text-body-sm text-text-secondary">Pickup window</p>
                <p className="font-mono text-headline-md tabular">{o.slotStart}–{o.slotEnd}</p>
                <p className="text-body-sm text-text-secondary">{isToday ? 'Today' : formatDate(o.date)} · {o.pickupLocation}</p>
              </div>
              {msToSlot !== null && msToSlot > 0 && <Pill tone="primary" icon="schedule">{formatIn(msToSlot)}</Pill>}
            </Card>
          )}

        </div>

        <div className="space-y-4 [grid-area:bottom]">
          <Card className="p-5">
            <h2 className="text-headline-md">Order summary</h2>
            <dl className="mt-3 space-y-2 text-body-md">
              <div className="flex justify-between"><dt className="text-text-secondary">Placed</dt><dd className="font-mono tabular">{timeIST(o.createdAt)}</dd></div>
              {o.items.map((i) => (
                <div key={i.name} className="flex justify-between gap-3">
                  <dt><span className="font-mono tabular">{i.qty} ×</span> {i.name}</dt>
                  <dd className="font-mono tabular">{formatINR(i.qty * i.unitPricePaise)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4"><dt className="text-text-secondary">Payment</dt><dd className="text-right">Added to your monthly canteen statement</dd></div>
              <div className="flex justify-between border-t border-dashed border-border-sand-strong pt-2 text-headline-sm"><dt>Total</dt><dd className="font-mono tabular">{formatINR(o.totalPaise)}</dd></div>
            </dl>
          </Card>

          {o.cancellable ? (
            <Button variant="danger" icon="cancel" fullWidth onClick={() => setConfirming(true)}>
              Cancel order
            </Button>
          ) : (
            live && (
              <Alert tone="warning">Ordering is closed, so this order can no longer be changed or cancelled.</Alert>
            )
          )}
          {cancel.error instanceof ApiError && <Alert tone="error">{cancel.error.message}</Alert>}
          <Link href="/menu" className="inline-flex min-h-[44px] items-center gap-1 text-label-lg font-semibold text-primary hover:underline">
            View today's full menu <Icon name="arrow_forward" size={18} />
          </Link>
        </div>

        {live && (
          <aside className="[grid-area:ticket] lg:self-start">
            <Ticket className="text-center">
              <div className="p-5">
                <p className="text-body-sm text-text-secondary">Show this at the counter</p>
                <div className="mx-auto mt-3 inline-block rounded-tile bg-white p-3 shadow-l1">
                  <img src={`/api/orders/${o.id}/qr`} alt="Pickup QR code" width={200} height={200} className="h-[200px] w-[200px]" />
                </div>
              </div>
              <div className="p-5">
                <p className="text-body-sm text-text-secondary">Backup code</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span data-testid="pickup-code" className="font-mono text-ticket-code-lg tabular">{o.pickupCode}</span>
                  <Button variant="ghost" icon="content_copy" aria-label="Copy pickup code" onClick={() => void copyCode()} />
                </div>
                {me && <p className="mt-2 text-body-sm text-text-secondary">Issued to {me.name} ({me.email})</p>}
              </div>
              <div className="flex justify-between p-4 text-body-sm text-text-secondary">
                <span>{o.pickupLocation}</span>
                <span className="font-mono">#{o.id}</span>
              </div>
            </Ticket>
          </aside>
        )}
      </div>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Cancel this order?"
        icon="restaurant"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>Keep order</Button>
            <Button variant="danger" loading={cancel.isPending} onClick={confirmCancel}>Yes, cancel order</Button>
          </>
        }
      >
        <p className="text-body-md text-text-secondary">The items go back on the menu. You can order again before {o.cutoff}.</p>
      </Dialog>
    </div>
  );
}
