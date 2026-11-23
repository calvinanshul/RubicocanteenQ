'use client';

import { exportRangeSchema, monthSchema, RANGE_MESSAGE } from '@/shared';
import { useEffect, useState } from 'react';
import { ApiError, downloadFile } from '../api/client';
import { Alert, Button, Icon, SectionCard, TextField, useToast } from '../components/ui';
import { clockIST } from '../lib/format';
import { useServerClock } from '../lib/serverClock';

const ORDER_COLUMNS = ['date', 'order_id', 'pickup_code', 'employee_name', 'employee_email', 'items', 'total_inr', 'status', 'slot'];
const STATEMENT_COLUMNS = ['employee', 'employee_code', 'department', 'email', 'orders', 'total_inr'];

function Columns({ names }: { names: string[] }) {
  return (
    <div className="mt-4">
      <p className="text-label-md uppercase tracking-wider text-text-secondary">Columns</p>
      <p className="mt-1 break-words font-mono text-body-sm text-text-secondary">{names.join(', ')}</p>
    </div>
  );
}

/** One download with its own busy and error state. */
function useDownload(onDone: (name: string) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  async function run(path: string, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      const name = await downloadFile(path, fallback);
      onDone(name);
      toast.show(`Downloaded ${name}`, 'success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Download failed. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}

/** S16 Exports (US-17): orders for a date range (1–92 days) and the monthly statement per employee. */
export function ExportsPage() {
  const { today, now } = useServerClock();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [month, setMonth] = useState('');
  const [recent, setRecent] = useState<{ name: string; at: string }[]>([]);
  const remember = (name: string) => setRecent((r) => [{ name, at: now ? clockIST(now) : '' }, ...r].slice(0, 5));
  const orders = useDownload(remember);
  const statement = useDownload(remember);

  // Defaults from the server clock: this month so far, and this month's statement
  useEffect(() => {
    if (!today) return;
    setFrom((v) => v || `${today.slice(0, 8)}01`);
    setTo((v) => v || today);
    setMonth((v) => v || today.slice(0, 7));
  }, [today]);

  function downloadOrders() {
    const parsed = exportRangeSchema.safeParse({ from, to });
    if (!parsed.success) return orders.setError(RANGE_MESSAGE);
    void orders.run(`/reports/orders.csv?from=${parsed.data.from}&to=${parsed.data.to}`, `orders_${from}_${to}.csv`);
  }

  function downloadStatement() {
    const parsed = monthSchema.safeParse(month);
    if (!parsed.success) return statement.setError('Choose a month');
    void statement.run(`/reports/statement.csv?month=${parsed.data}`, `statement_${month}.csv`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-xl-m md:text-headline-xl">Exports</h1>
        <p className="text-body-md text-text-secondary">CSV files open in Excel or Google Sheets. Amounts are in rupees.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Orders">
          <p className="text-body-md text-text-secondary">Every order in a date range, one row per order. Up to 92 days.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField label="From" type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); orders.setError(null); }} />
            <TextField label="To" type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); orders.setError(null); }} />
          </div>
          <Columns names={ORDER_COLUMNS} />
          {orders.error && <div className="mt-4"><Alert tone="error">{orders.error}</Alert></div>}
          <div className="mt-5">
            <Button icon="download" loading={orders.busy} disabled={!from || !to} onClick={downloadOrders}>Download CSV</Button>
          </div>
        </SectionCard>

        <SectionCard title="Monthly statement">
          <p className="text-body-md text-text-secondary">One row per employee: billed orders and total for payroll deduction.</p>
          <div className="mt-4 max-w-xs">
            <TextField label="Month" type="month" value={month} max={today?.slice(0, 7)} onChange={(e) => { setMonth(e.target.value); statement.setError(null); }} />
          </div>
          <Columns names={STATEMENT_COLUMNS} />
          <p className="mt-3 flex items-start gap-2 text-body-sm text-text-secondary">
            <Icon name="info" size={18} /> No-show orders are billed. Cancelled orders are not.
          </p>
          {statement.error && <div className="mt-4"><Alert tone="error">{statement.error}</Alert></div>}
          <div className="mt-5">
            <Button icon="download" loading={statement.busy} disabled={!month} onClick={downloadStatement}>Download CSV</Button>
          </div>
        </SectionCard>
      </div>

      {recent.length > 0 && (
        <SectionCard title="Recent downloads">
          <ul className="divide-y divide-border-sand">
            {recent.map((r, i) => (
              <li key={`${r.name}-${i}`} className="flex items-center justify-between gap-3 py-2">
                <span className="flex items-center gap-2 font-mono text-body-md"><Icon name="description" size={18} /> {r.name}</span>
                <span className="font-mono text-body-sm text-text-secondary">{r.at}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
