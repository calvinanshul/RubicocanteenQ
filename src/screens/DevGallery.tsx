'use client';

import { useState } from 'react';
import { ORDER_STATUSES } from '@/shared';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  Dialog,
  DietMarker,
  DishTile,
  EmptyState,
  Pill,
  PasswordField,
  SelectField,
  Skeleton,
  StatusBadge,
  Switch,
  TextField,
  Ticket,
  useToast,
  Wordmark,
} from '../components/ui';

/** /dev/ui: component gallery (development builds only). */
export function DevGallery() {
  const [open, setOpen] = useState(false);
  const [on, setOn] = useState(true);
  const toast = useToast();
  return (
    <main className="mx-auto max-w-content space-y-8 px-4 py-8 md:px-8">
      <Wordmark subtitle="UI kit · Fresh Counter" />
      <Card className="space-y-4 p-6">
        <h2 className="text-headline-md">Buttons</h2>
        <div className="flex flex-wrap gap-2">
          {(['primary', 'secondary', 'tint', 'ghost', 'danger', 'dark'] as const).map((v) => (
            <Button key={v} variant={v} icon="add">{v}</Button>
          ))}
          <Button disabled>disabled</Button>
          <Button loading>loading</Button>
          <Button size="xl">HAND OVER</Button>
        </div>
      </Card>
      <Card className="grid gap-4 p-6 md:grid-cols-2">
        <TextField label="Work email" icon="mail" placeholder="you@rubicotech.com" />
        <TextField label="With error" error="Use your company email (@rubicotech.com)" defaultValue="priya@gmail.com" />
        <PasswordField label="Password" hint="8–64 characters" />
        <SelectField label="Category" defaultValue="MAIN">
          <option value="MAIN">Mains</option>
          <option value="LIGHT">Light</option>
        </SelectField>
        <Switch checked={on} onChange={setOn} label="Active" showLabel tone="green" />
        <Checkbox label="Show archived" />
      </Card>
      <Card className="space-y-4 p-6">
        <h2 className="text-headline-md">Markers, badges, pills</h2>
        <div className="flex flex-wrap items-center gap-3">
          <DietMarker diet="VEG" /> <DietMarker diet="NON_VEG" /> <DietMarker diet="JAIN" />
          {ORDER_STATUSES.map((s) => <StatusBadge key={s} status={s} />)}
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone="success" icon="circle">12 left</Pill>
          <Pill tone="warning">Only 3 left</Pill>
          <Pill tone="error">Sold out</Pill>
          <Pill tone="selected">Veg 5</Pill>
          <Pill mono>42 min left</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DishTile name="Veg Biryani" category="MAIN" />
          <DishTile name="Dal Tadka + Rice" category="COMBO" />
          <DishTile name="Masala Chaas" category="BEVERAGE" />
          <Avatar name="Priya Sharma" role="EMPLOYEE" />
          <Avatar name="Sunita Devi" role="STAFF" />
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Alert tone="info" title="Your session expired.">Please log in again.</Alert>
        <Alert tone="success" title="Role updated.">Sunita Devi is now Staff.</Alert>
        <Alert tone="warning" title="Only 3 left">Order soon.</Alert>
        <Alert tone="error" title="Already collected at 13:04" />
      </div>
      <Ticket className="max-w-sm">
        <div className="p-4 font-mono text-ticket-code-lg">K7Q4MZ</div>
        <div className="p-4">1 × Veg Biryani</div>
        <div className="p-4 text-text-secondary">Slot 13:00–13:15</div>
      </Ticket>
      <Card className="p-6">
        <Skeleton className="h-6 w-1/2" />
        <EmptyState icon="receipt_long" title="No orders yet">Go to the menu to order lunch.</EmptyState>
      </Card>
      <div className="flex gap-2">
        <Button onClick={() => setOpen(true)}>Open dialog</Button>
        <Button variant="secondary" onClick={() => toast.show('Menu saved')}>Show toast</Button>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Cancel this order?" icon="restaurant" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Keep order</Button><Button variant="danger">Cancel order</Button></>}>
        The items go back on the menu.
      </Dialog>
    </main>
  );
}
