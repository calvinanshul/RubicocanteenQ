import { formatINR, type DailyMenuItemDto } from '@/shared';
import { Button, DietMarker, DishTile, Pill, QtyStepper } from '../../components/ui';

export const SCARCE_AT = 5;

/** Dish card (S3): available · scarce · in cart · sold out (UI spec §3). */
export function DishCard({ item, qty, max, onQty, orderingDisabled }: { item: DailyMenuItemDto; qty: number; max: number; onQty: (qty: number) => void; orderingDisabled: boolean }) {
  const soldOut = item.remaining <= 0;
  return (
    <article aria-label={item.name} className={`card flex gap-4 p-4 ${soldOut ? 'bg-surface-cream/60' : ''}`}>
      <div className={soldOut ? 'opacity-60' : ''}>
        <DishTile name={item.name} category={item.category} size={64} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="flex items-center gap-2 text-headline-sm">
            <DietMarker diet={item.diet} />
            <span>{item.name}</span>
          </h3>
          <span className={`font-mono text-ticket-code-sm tabular ${soldOut ? 'text-text-secondary' : 'text-primary'}`}>{formatINR(item.pricePaise)}</span>
        </div>
        {item.description && <p className="mt-1 line-clamp-2 text-body-md text-text-secondary">{item.description}</p>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {soldOut ? (
            <Pill tone="error" icon="block">Sold out</Pill>
          ) : item.remaining <= SCARCE_AT ? (
            <Pill tone="warning">Only {item.remaining} left</Pill>
          ) : (
            <span className="flex items-center gap-1.5 text-body-sm text-veg">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-veg" />
              <span className="font-mono tabular">{item.remaining}</span> left
            </span>
          )}
          {soldOut ? (
            <Button variant="secondary" disabled>Unavailable</Button>
          ) : qty > 0 ? (
            <QtyStepper name={item.name} qty={qty} max={max} onChange={onQty} disabled={orderingDisabled} />
          ) : (
            <Button variant="tint" icon="add" disabled={orderingDisabled} onClick={() => onQty(1)}>
              Add
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
