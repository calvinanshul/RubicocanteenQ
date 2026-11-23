'use client';

import { CATEGORIES, DIETS, menuItemSchema, PRICE_MESSAGE, toPaise, zodFieldErrors, type Category, type Diet, type MenuItemDto } from '@/shared';
import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useSaveMenuItem, type MenuItemPatch } from '../api/hooks';
import { Alert, Button, DietMarker, Dialog, SelectField, Switch, TextField, useToast } from '../components/ui';

export const CATEGORY_NAMES: Record<Category, string> = {
  MAIN: 'Main',
  COMBO: 'Combo',
  LIGHT: 'Light meal',
  SIDE: 'Side',
  DESSERT: 'Dessert',
  BEVERAGE: 'Beverage',
};
export const DIET_NAMES: Record<Diet, string> = { VEG: 'Veg', NON_VEG: 'Non-veg', JAIN: 'Jain' };

interface FormState {
  name: string;
  description: string;
  category: Category;
  price: string;
  diet: Diet;
  isActive: boolean;
}

function initial(item: MenuItemDto | null): FormState {
  return item
    ? { name: item.name, description: item.description ?? '', category: item.category, price: (item.pricePaise / 100).toFixed(2).replace(/\.00$/, ''), diet: item.diet, isActive: item.isActive }
    : { name: '', description: '', category: 'MAIN', price: '', diet: 'VEG', isActive: true };
}

/** Client-side check with the shared schema; returns the API body or field errors keyed by form field. */
function toBody(f: FormState): { body?: MenuItemPatch & { pricePaise: number }; errors: Record<string, string> } {
  let pricePaise = Number.NaN;
  try {
    if (f.price.trim()) pricePaise = toPaise(f.price);
  } catch {
    // more than 2 decimals or not a number: reported below
  }
  const parsed = menuItemSchema.safeParse({
    name: f.name,
    description: f.description.trim() ? f.description : undefined,
    category: f.category,
    pricePaise,
    diet: f.diet,
  });
  if (!parsed.success) {
    const { pricePaise: priceErr, ...rest } = zodFieldErrors(parsed.error);
    return { errors: { ...rest, ...(priceErr ? { price: PRICE_MESSAGE } : {}) } };
  }
  return { body: { ...parsed.data, description: parsed.data.description ?? '' }, errors: {} };
}

/** S12 Add / edit menu item (US-06). Prices are typed in rupees and sent as paise. */
export function MenuItemDialog({ item, onClose }: { item: MenuItemDto | null; onClose: () => void }) {
  const [form, setForm] = useState<FormState>(() => initial(item));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useSaveMenuItem();
  const toast = useToast();
  const editing = item !== null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const { [key === 'price' ? 'price' : key]: _drop, ...rest } = e;
      return rest;
    });
  };

  /** API field errors (e.g. 409 DUPLICATE_NAME on `name`) go next to their fields. */
  function showFieldErrors(err: Error) {
    if (err instanceof ApiError && Object.keys(err.fields).length > 0) {
      const { pricePaise, ...rest } = err.fields;
      setErrors({ ...rest, ...(pricePaise ? { price: pricePaise } : {}) });
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const { body, errors: found } = toBody(form);
    if (!body) {
      setErrors(found);
      return;
    }
    save.mutate(
      { id: item?.id, body: editing ? { ...body, isActive: form.isActive } : body },
      {
        onSuccess: (saved) => {
          toast.show(editing ? `${saved.name} saved` : `${saved.name} added to the catalogue`, 'success');
          onClose();
        },
        onError: showFieldErrors,
      },
    );
  }

  function archive(active: boolean) {
    if (!item) return;
    save.mutate(
      { id: item.id, body: { isActive: active } },
      {
        onSuccess: (saved) => {
          toast.show(active ? `${saved.name} restored` : `${saved.name} archived`, 'success');
          onClose();
        },
        // BUG-04-001: a restore can clash with an active dish of the same name (409 on `name`)
        onError: showFieldErrors,
      },
    );
  }

  const formError = save.error instanceof ApiError && Object.keys(save.error.fields).length === 0 ? save.error.message : null;

  return (
    <Dialog
      open
      onClose={onClose}
      icon={editing ? 'edit' : 'add'}
      title={editing ? 'Edit menu item' : 'Add menu item'}
      footer={
        <>
          {editing && (
            <Button variant="danger" icon={item.isActive ? 'archive' : 'unarchive'} className="mr-auto" disabled={save.isPending} onClick={() => archive(!item.isActive)}>
              {item.isActive ? 'Archive item' : 'Restore item'}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="menu-item-form" loading={save.isPending}>Save</Button>
        </>
      }
    >
      {editing && <p className="-mt-2 mb-4 text-body-sm text-text-secondary">Existing orders keep their price.</p>}
      <form id="menu-item-form" onSubmit={submit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField label="Dish name" value={form.name} maxLength={80} error={errors.name} onChange={(e) => set('name', e.target.value)} required />
        <TextField
          label="Description"
          value={form.description}
          maxLength={300}
          error={errors.description}
          hint={`${form.description.length}/300`}
          trailingLabel={<span className="text-body-sm text-text-secondary">Optional</span>}
          onChange={(e) => set('description', e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Category" value={form.category} error={errors.category} onChange={(e) => set('category', e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_NAMES[c]}</option>
            ))}
          </SelectField>
          <TextField
            label="Price (₹)"
            inputMode="decimal"
            value={form.price}
            error={errors.price}
            hint="₹1 to ₹1,000, up to 2 decimals"
            placeholder="120"
            className="font-mono"
            onChange={(e) => set('price', e.target.value)}
          />
        </div>
        <fieldset>
          <legend className="mb-1.5 text-label-lg">Diet</legend>
          <div className="grid grid-cols-3 gap-2">
            {DIETS.map((d) => (
              <label
                key={d}
                className={`flex min-h-[48px] cursor-pointer items-center gap-2 rounded-btn border px-3 has-[:focus-visible]:shadow-focus ${form.diet === d ? 'border-[1.5px] border-primary bg-primary-tint' : 'border-border-sand-strong bg-white'}`}
              >
                <input type="radio" name="diet" value={d} checked={form.diet === d} onChange={() => set('diet', d)} className="h-4 w-4 accent-primary" />
                <span aria-hidden="true" className="inline-flex"><DietMarker diet={d} /></span>
                <span className="text-label-lg">{DIET_NAMES[d]}</span>
              </label>
            ))}
          </div>
          {errors.diet && <p className="mt-1.5 text-body-sm text-error">{errors.diet}</p>}
        </fieldset>
        {editing && <Switch checked={form.isActive} onChange={(v) => set('isActive', v)} label="Active (can be put on a daily menu)" showLabel tone="green" />}
      </form>
    </Dialog>
  );
}
