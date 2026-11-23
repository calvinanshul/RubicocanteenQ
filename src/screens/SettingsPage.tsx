'use client';

import { closedDateSchema, settingsSchema, SLOT_MINUTES_OPTIONS, zodFieldErrors, type PublicSettings, type SettingsInput } from '@/shared';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useClosedDateActions, useClosedDates, useSaveSettings, useSettings } from '../api/hooks';
import { Alert, Button, Checkbox, ErrorState, Icon, SectionCard, Skeleton, TextField, useToast } from '../components/ui';
import { formatDate } from '../lib/format';
import { useServerClock } from '../lib/serverClock';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Monday first, the way the canteen thinks about the week. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface FormState {
  orderCutoff: string;
  maxQtyPerItem: string;
  slotStart: string;
  slotEnd: string;
  slotMinutes: number;
  slotCapacity: string;
  noShowGraceMinutes: string;
  pickupLocation: string;
  allowedDomains: string[];
  closedWeekdays: number[];
}

function toForm(s: PublicSettings): FormState {
  return {
    orderCutoff: s.orderCutoff,
    maxQtyPerItem: String(s.maxQtyPerItem),
    slotStart: s.slotStart,
    slotEnd: s.slotEnd,
    slotMinutes: s.slotMinutes,
    slotCapacity: String(s.slotCapacity),
    noShowGraceMinutes: String(s.noShowGraceMinutes),
    pickupLocation: s.pickupLocation,
    allowedDomains: s.allowedDomains ?? [],
    closedWeekdays: [...s.closedWeekdays].sort(),
  };
}

const num = (v: string) => (v.trim() === '' ? Number.NaN : Number(v));

function toInput(f: FormState): Record<keyof SettingsInput, unknown> {
  return {
    orderCutoff: f.orderCutoff,
    maxQtyPerItem: num(f.maxQtyPerItem),
    slotStart: f.slotStart,
    slotEnd: f.slotEnd,
    slotMinutes: f.slotMinutes,
    slotCapacity: num(f.slotCapacity),
    noShowGraceMinutes: num(f.noShowGraceMinutes),
    pickupLocation: f.pickupLocation,
    allowedDomains: f.allowedDomains,
    closedWeekdays: f.closedWeekdays,
  };
}

/** Field errors for the domains list collapse onto one key. */
function normaliseErrors(fields: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    const key = k.startsWith('allowedDomains') ? 'allowedDomains' : k.startsWith('closedWeekdays') ? 'closedWeekdays' : k;
    out[key] ??= v;
  }
  return out;
}

function Holidays({ today }: { today: string | null }) {
  const list = useClosedDates(today);
  const { add, remove } = useClosedDateActions();
  const toast = useToast();
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Not a <form>: this sits inside the settings form, and forms can't nest
  function addHoliday() {
    const parsed = closedDateSchema.safeParse({ date, reason });
    if (!parsed.success) return setErrors(zodFieldErrors(parsed.error));
    add.mutate(parsed.data, {
      onSuccess: () => {
        toast.show(`${formatDate(parsed.data.date, true)} is now a holiday`, 'success');
        setDate('');
        setReason('');
        setErrors({});
      },
      onError: (err) => err instanceof ApiError && setErrors(Object.keys(err.fields).length ? err.fields : { date: err.message }),
    });
  }

  return (
    <div>
      <h3 className="text-label-lg">Holidays</h3>
      <p className="text-body-sm text-text-secondary">No ordering on these dates. Saved straight away.</p>
      {list.isPending ? (
        <Skeleton className="mt-3 h-12" />
      ) : list.isError ? (
        <ErrorState message="We couldn't load the holidays." onRetry={() => void list.refetch()} />
      ) : list.data.length === 0 ? (
        <p className="mt-3 text-body-md text-text-secondary">No upcoming holidays.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border-sand rounded-tile border border-border-sand">
          {list.data.map((h) => (
            <li key={h.date} className="flex items-center justify-between gap-3 px-3 py-2">
              <span>
                <span className="text-label-lg">{formatDate(h.date, true)}</span>
                <span className="ml-2 text-body-md text-text-secondary">{h.reason}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon="delete"
                aria-label={`Remove holiday ${formatDate(h.date, true)}`}
                loading={remove.isPending && remove.variables === h.date}
                onClick={() => remove.mutate(h.date, { onSuccess: () => toast.show('Holiday removed', 'success') })}
              />
            </li>
          ))}
        </ul>
      )}
      <div
        className="mt-3 grid items-start gap-2 sm:grid-cols-[auto_1fr_auto]"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addHoliday();
          }
        }}
      >
        <TextField label="Holiday date" type="date" min={today ?? undefined} value={date} error={errors.date} onChange={(e) => setDate(e.target.value)} />
        <TextField label="Reason" value={reason} maxLength={120} placeholder="e.g. Diwali" error={errors.reason} onChange={(e) => setReason(e.target.value)} />
        <Button variant="secondary" icon="event_busy" loading={add.isPending} className="sm:mt-7" onClick={addHoliday}>Add holiday</Button>
      </div>
    </div>
  );
}

/** S15 Settings & rules (US-05, admin only, D19). Changes apply to new orders only. */
export function SettingsPage() {
  const settings = useSettings();
  const save = useSaveSettings();
  const toast = useToast();
  const clock = useServerClock();
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [domain, setDomain] = useState('');

  const original = useMemo(() => (settings.data ? toForm(settings.data) : null), [settings.data]);
  useEffect(() => {
    if (original && !form) setForm(original);
  }, [original, form]);

  if (settings.isPending || (!form && !settings.isError)) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading settings">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  if (settings.isError || !form || !original) {
    return <div className="card"><ErrorState message="We couldn't load the settings." onRetry={() => void settings.refetch()} /></div>;
  }

  const changed = (Object.keys(form) as (keyof FormState)[]).filter((k) => JSON.stringify(form[k]) !== JSON.stringify(original[k])).length;
  const errorCount = Object.keys(errors).length;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setErrors((e) => {
      const { [key]: _drop, ...rest } = e;
      return rest;
    });
  };

  function addDomain() {
    if (!form) return;
    const d = domain.trim().toLowerCase().replace(/^@/, '');
    if (!d) return;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) return setErrors((e) => ({ ...e, allowedDomains: 'Enter a valid domain, like rubicotech.com' }));
    if (!form.allowedDomains.includes(d)) set('allowedDomains', [...form.allowedDomains, d]);
    setDomain('');
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const parsed = settingsSchema.safeParse(toInput(form));
    if (!parsed.success) {
      setErrors(normaliseErrors(zodFieldErrors(parsed.error)));
      return;
    }
    save.mutate(parsed.data, {
      onSuccess: (saved) => {
        setForm(toForm(saved));
        setErrors({});
        toast.show('Settings saved. They apply to new orders.', 'success');
      },
      onError: (err) => err instanceof ApiError && setErrors(normaliseErrors(err.fields)),
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6 pb-28">
      <div>
        <h1 className="text-headline-xl-m md:text-headline-xl">Settings & rules</h1>
        <p className="text-body-md text-text-secondary">Changes apply to new orders only. Orders already placed keep their slot and price.</p>
      </div>
      {save.error instanceof ApiError && Object.keys(save.error.fields).length === 0 && <Alert tone="error">{save.error.message}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Ordering">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Order cut-off" type="time" value={form.orderCutoff} error={errors.orderCutoff} hint="Same day, IST" onChange={(e) => set('orderCutoff', e.target.value)} />
            <TextField label="Max quantity per dish" type="number" inputMode="numeric" min={1} max={10} value={form.maxQtyPerItem} error={errors.maxQtyPerItem} hint="1–10" onChange={(e) => set('maxQtyPerItem', e.target.value)} />
          </div>
        </SectionCard>

        <SectionCard title="Pickup">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Pickup window start" type="time" value={form.slotStart} error={errors.slotStart} onChange={(e) => set('slotStart', e.target.value)} />
            <TextField label="Pickup window end" type="time" value={form.slotEnd} error={errors.slotEnd} onChange={(e) => set('slotEnd', e.target.value)} />
          </div>
          <fieldset className="mt-4">
            <legend className="mb-1.5 text-label-lg">Slot length</legend>
            <div className="inline-flex rounded-btn bg-border-sand p-1">
              {SLOT_MINUTES_OPTIONS.map((m) => (
                <label key={m} className={`flex min-h-[40px] cursor-pointer items-center rounded-[10px] px-4 text-label-lg has-[:focus-visible]:shadow-focus ${form.slotMinutes === m ? 'bg-primary text-white' : 'text-text-secondary'}`}>
                  <input type="radio" name="slotMinutes" value={m} checked={form.slotMinutes === m} onChange={() => set('slotMinutes', m)} className="sr-only" />
                  {m} min
                </label>
              ))}
            </div>
            {errors.slotMinutes && <p className="mt-1.5 text-body-sm text-error">{errors.slotMinutes}</p>}
          </fieldset>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField label="Orders per slot" type="number" inputMode="numeric" min={1} max={500} value={form.slotCapacity} error={errors.slotCapacity} hint="1–500" onChange={(e) => set('slotCapacity', e.target.value)} />
            <TextField label="No-show after (minutes)" type="number" inputMode="numeric" min={0} max={240} value={form.noShowGraceMinutes} error={errors.noShowGraceMinutes} hint="After the slot ends" onChange={(e) => set('noShowGraceMinutes', e.target.value)} />
          </div>
          <div className="mt-4">
            <TextField label="Pickup location" value={form.pickupLocation} maxLength={80} error={errors.pickupLocation} hint="Shown on every pass" onChange={(e) => set('pickupLocation', e.target.value)} />
          </div>
        </SectionCard>

        <SectionCard title="Access">
          <p className="text-label-lg">Allowed email domains</p>
          <p className="text-body-sm text-text-secondary">Only these work emails can sign up.</p>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Allowed domains">
            {form.allowedDomains.map((d) => (
              <li key={d} className="inline-flex items-center gap-1 rounded-full border border-border-sand-strong bg-white py-1 pl-3 pr-1 font-mono text-body-md">
                @{d}
                <button
                  type="button"
                  aria-label={`Remove ${d}`}
                  onClick={() => set('allowedDomains', form.allowedDomains.filter((x) => x !== d))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-border-sand"
                >
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-start gap-2">
            <div className="flex-1">
              <TextField
                label="Add a domain"
                value={domain}
                placeholder="rubicotech.in"
                error={errors.allowedDomains}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addDomain();
                  }
                }}
              />
            </div>
            <Button variant="secondary" icon="add" className="mt-7" onClick={addDomain}>Add</Button>
          </div>
        </SectionCard>

        <SectionCard title="Calendar">
          <fieldset>
            <legend className="text-label-lg">Closed every week</legend>
            <div className="mt-2 flex flex-wrap gap-x-4">
              {WEEK_ORDER.map((d) => (
                <Checkbox
                  key={d}
                  label={WEEKDAYS[d] ?? ''}
                  checked={form.closedWeekdays.includes(d)}
                  onChange={(e) => set('closedWeekdays', e.target.checked ? [...form.closedWeekdays, d].sort() : form.closedWeekdays.filter((x) => x !== d))}
                />
              ))}
            </div>
            {errors.closedWeekdays && <p className="mt-1.5 text-body-sm text-error">{errors.closedWeekdays}</p>}
          </fieldset>
          <div className="mt-5 border-t border-border-sand pt-4">
            <Holidays today={clock.today} />
          </div>
        </SectionCard>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-sand bg-white/95 backdrop-blur min-[900px]:left-[264px]">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <p className="text-body-md text-text-secondary" aria-live="polite">
            {errorCount > 0 && <span className="text-error">{errorCount} {errorCount === 1 ? 'field needs' : 'fields need'} fixing · </span>}
            {changed === 0 ? 'No unsaved changes' : `${changed} unsaved ${changed === 1 ? 'change' : 'changes'}`}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={changed === 0 || save.isPending}
              onClick={() => {
                setForm(original);
                setErrors({});
              }}
            >
              Discard
            </Button>
            <Button type="submit" icon="save" loading={save.isPending} disabled={changed === 0}>Save settings</Button>
          </div>
        </div>
      </div>
    </form>
  );
}
