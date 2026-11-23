'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParamsState } from '@/lib/navigation';
import { dateSchema, formatINR, QUANTITY_MESSAGE, type DailyMenuDto, type MenuItemDto } from '@/shared';
import { api, ApiError } from '../api/client';
import { useDailyMenu, useMenuItems, useSaveDailyMenu, useSettings } from '../api/hooks';
import {
  Alert,
  Button,
  DietMarker,
  DishTile,
  ErrorState,
  Icon,
  Pill,
  SectionCard,
  Skeleton,
  Switch,
  useToast,
} from '../components/ui';
import { addDays, formatDate, weekdayName } from '../lib/format';
import { useServerClock } from '../lib/serverClock';

interface RowState {
  on: boolean;
  qty: string;
}
type FormState = Record<number, RowState>;

interface Row {
  item: Pick<MenuItemDto, 'id' | 'name' | 'category' | 'diet' | 'pricePaise'>;
  ordered: number;
}

function initialState(rows: Row[], menu: DailyMenuDto | null | undefined): FormState {
  const onMenu = new Map((menu?.items ?? []).map((i) => [i.menuItemId, i.quantity]));
  const state: FormState = {};
  for (const r of rows) {
    const qty = onMenu.get(r.item.id);
    state[r.item.id] = { on: qty !== undefined, qty: qty !== undefined ? String(qty) : '' };
  }
  return state;
}

/** Client-side rules mirror the API (US-07 AC2, AC3): returns an error per dish id. */
export function validateRows(rows: Row[], state: FormState): Record<number, string> {
  const errors: Record<number, string> = {};
  for (const r of rows) {
    const s = state[r.item.id];
    if (!s) continue;
    if (!s.on) {
      if (r.ordered > 0) errors[r.item.id] = `Has ${r.ordered} portions ordered, so it can't be taken off the menu`;
      continue;
    }
    const n = Number(s.qty);
    if (s.qty.trim() === '' || !Number.isInteger(n) || n < 1 || n > 1000) errors[r.item.id] = QUANTITY_MESSAGE;
    else if (n < r.ordered) errors[r.item.id] = `Can't be lower than already ordered (${r.ordered})`;
  }
  return errors;
}

/** S13 Daily menu editor (US-07, M4/M5). */
export function DailyMenuEditor() {
  const clock = useServerClock();
  const today = clock.today ?? '';
  const [params, setParams] = useSearchParamsState();
  // Ignore a missing or malformed ?date= (old bookmark, typo) and fall back to tomorrow (BUG-01-003).
  const requested = params.get('date');
  const date = requested && dateSchema.safeParse(requested).success ? requested : today ? addDays(today, 1) : '';
  const setDate = (d: string) => setParams({ date: d }, { replace: true });

  const items = useMenuItems();
  const menu = useDailyMenu(date);
  const settings = useSettings();
  const save = useSaveDailyMenu(date);
  const toast = useToast();
  const qc = useQueryClient();

  const readOnly = date < today;

  const rows: Row[] = useMemo(() => {
    const orderedById = new Map((menu.data?.items ?? []).map((i) => [i.menuItemId, i.ordered]));
    const list: Row[] = (items.data ?? []).map((item) => ({ item, ordered: orderedById.get(item.id) ?? 0 }));
    // Dishes on this date's menu that have since been archived still need a row.
    for (const i of menu.data?.items ?? []) {
      if (!list.some((r) => r.item.id === i.menuItemId)) {
        list.push({ item: { id: i.menuItemId, name: i.name, category: i.category, diet: i.diet, pricePaise: i.pricePaise }, ordered: i.ordered });
      }
    }
    return list;
  }, [items.data, menu.data]);

  const [state, setState] = useState<FormState>({});
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<number, boolean>>({});
  const [serverErrors, setServerErrors] = useState<Record<number, string>>({});

  const ready = items.isSuccess && menu.isSuccess;
  useEffect(() => {
    if (ready && loadedFor !== date) {
      setState(initialState(rows, menu.data));
      setLoadedFor(date);
      setSubmitted(false);
      setTouched({});
      setServerErrors({});
      save.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-initialise when the date's data first arrives
  }, [ready, date, loadedFor]);

  const errors = useMemo(() => ({ ...validateRows(rows, state), ...serverErrors }), [rows, state, serverErrors]);
  const visibleErrors = Object.fromEntries(Object.entries(errors).filter(([id]) => submitted || touched[Number(id)]));
  const onRows = rows.filter((r) => state[r.item.id]?.on);
  const noneOn = onRows.length === 0;
  const problemCount = Object.keys(visibleErrors).length + (submitted && noneOn ? 1 : 0);

  const glance = {
    dishes: onRows.length,
    portions: onRows.reduce((sum, r) => sum + (Number(state[r.item.id]?.qty) || 0), 0),
    veg: onRows.filter((r) => r.item.diet !== 'NON_VEG').length,
    nonVeg: onRows.filter((r) => r.item.diet === 'NON_VEG').length,
    ordered: rows.reduce((sum, r) => sum + r.ordered, 0),
  };

  function update(id: number, patch: Partial<RowState>) {
    setState((s) => ({ ...s, [id]: { on: s[id]?.on ?? false, qty: s[id]?.qty ?? '', ...patch } }));
    setServerErrors((e) => {
      const { [id]: _drop, ...rest } = e;
      return rest;
    });
  }

  async function copyFromToday() {
    try {
      const todays = await qc.fetchQuery({
        queryKey: ['daily-menu', today],
        queryFn: () => api<DailyMenuDto>(`/daily-menu?date=${today}`),
      });
      const next = initialState(rows, todays);
      // Keep dishes that already have orders on this date
      for (const r of rows) if (r.ordered > 0 && !next[r.item.id]?.on) next[r.item.id] = state[r.item.id] ?? { on: true, qty: String(r.ordered) };
      setState(next);
      toast.show("Copied today's dishes and portions", 'info');
    } catch (err) {
      toast.show(err instanceof ApiError && err.code === 'MENU_NOT_PUBLISHED' ? "Today's menu isn't published" : "Couldn't copy today's menu", 'error');
    }
  }

  function onSave() {
    setSubmitted(true);
    if (noneOn || Object.keys(errors).length) return;
    const entries = onRows.map((r) => ({ menuItemId: r.item.id, quantity: Number(state[r.item.id]?.qty) }));
    save.mutate(
      { entries },
      {
        onSuccess: (saved) => {
          toast.show(`Menu saved for ${formatDate(date)}`);
          setState(initialState(rows, saved));
          setSubmitted(false);
          setTouched({});
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            const mapped: Record<number, string> = {};
            for (const [key, msg] of Object.entries(err.fields)) {
              const m = /^entries\.(\d+)\./.exec(key);
              const entry = m ? entries[Number(m[1])] : undefined;
              if (entry) mapped[entry.menuItemId] = msg;
            }
            setServerErrors(mapped);
          }
        },
      },
    );
  }

  const dayLabel = date === today ? 'Today' : today && date === addDays(today, 1) ? 'Tomorrow' : readOnly ? 'Past' : null;

  if (!date && clock.error) {
    return <div className="card"><ErrorState message="We couldn't load the menu." onRetry={clock.retry} /></div>;
  }
  if (!date) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading menu">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-xl-m md:text-headline-xl">Daily menu</h1>
          <p className="mt-1 text-body-md text-text-secondary">Choose the dishes and portions for a day. Employees see them straight away.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon="content_copy" onClick={copyFromToday} disabled={readOnly || date === today || !ready}>
            Copy from today
          </Button>
          <Button icon="save" onClick={onSave} loading={save.isPending} disabled={readOnly || !ready}>
            Save menu
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="md" icon="chevron_left" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))} />
        <div className="flex min-h-[44px] items-center gap-2 rounded-btn border border-border-sand-strong bg-white px-4">
          <Icon name="calendar_month" size={20} className="text-text-secondary" />
          <span className="font-semibold" data-testid="menu-date">{formatDate(date, true)}</span>
          {dayLabel && <Pill tone={readOnly ? 'neutral' : 'primary'}>{dayLabel}</Pill>}
        </div>
        <Button variant="secondary" size="md" icon="chevron_right" aria-label="Next day" onClick={() => setDate(addDays(date, 1))} />
        <label className="sr-only" htmlFor="menu-date-input">Pick a date</label>
        <input
          id="menu-date-input"
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="min-h-[44px] rounded-btn border border-border-sand-strong bg-white px-3 text-body-md"
        />
      </div>

      <div className="mt-4 space-y-3">
        {readOnly && <Alert tone="info" title="This date is in the past.">Past menus are read-only.</Alert>}
        {!readOnly && menu.data?.closed && (
          <Alert tone="warning" title="The canteen is closed on this day.">Employees won't see this menu unless the day is opened in Settings.</Alert>
        )}
        {!readOnly && menu.isSuccess && menu.data === null && (
          <Alert tone="info" title="Not published yet.">Switch dishes on, set portions and save to publish the menu.</Alert>
        )}
        {!readOnly && menu.data && !menu.data.closed && settings.data && (
          <Alert tone="info">
            Employees can order until <strong>{weekdayName(date)} {settings.data.orderCutoff}</strong> ·{' '}
            <span className="font-mono tabular">{glance.ordered}</span> portions ordered so far
          </Alert>
        )}
        {save.error instanceof ApiError && <Alert tone="error">{save.error.message}</Alert>}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="card overflow-hidden" aria-label="Dishes">
          {items.isError || menu.isError ? (
            <ErrorState message="We couldn't load the menu." onRetry={() => { void items.refetch(); void menu.refetch(); }} />
          ) : !ready ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-text-secondary">No active dishes. Add dishes in the Menu Catalogue first.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead className="bg-surface-cream text-[12px] font-semibold uppercase tracking-wide text-text-secondary">
                  <tr>
                    <th scope="col" className="px-4 py-3">On menu</th>
                    <th scope="col" className="px-4 py-3">Dish</th>
                    <th scope="col" className="px-4 py-3">Price</th>
                    <th scope="col" className="px-4 py-3">Portions</th>
                    <th scope="col" className="px-4 py-3">Already ordered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-sand">
                  {rows.map((r) => {
                    const s = state[r.item.id] ?? { on: false, qty: '' };
                    const err = visibleErrors[r.item.id];
                    const inputId = `qty-${r.item.id}`;
                    return (
                      <tr key={r.item.id} className={s.on ? '' : 'bg-surface-cream/40'} data-testid={`daily-row-${r.item.id}`}>
                        <td className="px-4 py-3 align-top">
                          <Switch
                            checked={s.on}
                            disabled={readOnly}
                            label={`On menu: ${r.item.name}`}
                            onChange={(on) => {
                              update(r.item.id, { on, qty: on && !s.qty ? '' : s.qty });
                              setTouched((t) => ({ ...t, [r.item.id]: true }));
                            }}
                          />
                        </td>
                        <td className={`px-4 py-3 align-top ${s.on ? '' : 'opacity-60'}`}>
                          <div className="flex items-center gap-3">
                            <DishTile name={r.item.name} category={r.item.category} size={44} />
                            <DietMarker diet={r.item.diet} />
                            <span className="text-headline-sm">{r.item.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top font-mono tabular text-primary">{formatINR(r.item.pricePaise)}</td>
                        <td className="px-4 py-3 align-top">
                          <label htmlFor={inputId} className="sr-only">Portions for {r.item.name}</label>
                          <input
                            id={inputId}
                            type="number"
                            inputMode="numeric"
                            min={Math.max(1, r.ordered)}
                            max={1000}
                            step={1}
                            value={s.qty}
                            disabled={readOnly || !s.on}
                            aria-invalid={err ? true : undefined}
                            aria-describedby={err ? `${inputId}-error` : undefined}
                            onChange={(e) => update(r.item.id, { qty: e.target.value })}
                            onBlur={() => setTouched((t) => ({ ...t, [r.item.id]: true }))}
                            className={`min-h-[44px] w-28 rounded-btn bg-white px-3 font-mono tabular disabled:bg-surface-cream disabled:text-text-secondary ${err ? 'border-[1.5px] border-error' : 'border border-border-sand-strong'}`}
                          />
                          {err && (
                            <p id={`${inputId}-error`} className="mt-1.5 flex max-w-[220px] items-start gap-1 text-body-sm text-error">
                              <Icon name="error" size={16} /> {err}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top font-mono tabular">{r.ordered}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <SectionCard title="At a glance">
            <dl className="grid grid-cols-2 gap-4">
              {[
                ['Dishes', glance.dishes],
                ['Portions', glance.portions],
                ['Veg / Non-veg', `${glance.veg} / ${glance.nonVeg}`],
                ['Ordered', glance.ordered],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-body-sm text-text-secondary">{k}</dt>
                  <dd className="font-mono text-headline-md tabular">{v}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>
          {problemCount > 0 && (
            <Alert tone="error" title={`${problemCount} problem${problemCount === 1 ? '' : 's'} to fix before saving`}>
              {submitted && noneOn ? 'Add at least one dish to the menu.' : 'Check the highlighted portions.'}
            </Alert>
          )}
          <SectionCard title="Rules">
            <ul className="list-disc space-y-1 pl-5 text-body-md text-text-secondary">
              <li>Portions: whole numbers from 1 to 1,000.</li>
              <li>You can't go below what's already ordered.</li>
              <li>Dishes with orders can't be taken off the menu.</li>
              <li>Past dates are read-only.</li>
            </ul>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
