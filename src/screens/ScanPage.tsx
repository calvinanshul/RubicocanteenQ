'use client';

import type { VerifyDto } from '@/shared';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ApiError } from '../api/client';
import { useCollect, useVerifyCode } from '../api/hooks';
import { Alert, Button, DietMarker, Icon, StatusBadge, SuccessCheck, Ticket } from '../components/ui';

type Camera = 'starting' | 'on' | 'unavailable';
const READER_ID = 'qr-reader';

interface Scanner {
  stop: () => Promise<void>;
  clear: () => void;
}

/**
 * Release the camera without ever throwing. html5-qrcode's stop() throws synchronously (not a rejected promise)
 * when the scanner isn't running, e.g. the camera was denied or is still starting. Thrown from an effect cleanup,
 * that crashed the next page (BUG-03-003).
 */
function releaseScanner(scanner: Scanner): void {
  try {
    void scanner.stop().then(() => scanner.clear()).catch(() => undefined);
  } catch {
    // Not running: nothing to stop
  }
}

/** Camera scanning with html5-qrcode, loaded on demand. Any failure (no camera, permission denied) → typed code. */
function useQrCamera(onCode: (code: string) => void): Camera {
  const [state, setState] = useState<Camera>('starting');
  const cb = useRef(onCode);
  cb.current = onCode;
  useEffect(() => {
    let stopped = false;
    let scanner: Scanner | null = null;
    let running = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unavailable');
      return;
    }
    void (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (stopped) return;
        const s = new Html5Qrcode(READER_ID, { verbose: false });
        scanner = s;
        await s.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, (text) => cb.current(text), () => undefined);
        running = true;
        // The page was left while the camera was starting: switch it off again
        if (stopped) releaseScanner(s);
        else setState('on');
      } catch {
        if (!stopped) setState('unavailable');
      }
    })();
    return () => {
      stopped = true;
      // Still starting: the start handler above releases it once it is running
      if (scanner && running) releaseScanner(scanner);
    };
  }, []);
  return state;
}

/** S8 Scan / verify pickup (US-13): scan or type the code, check it, hand over exactly once. */
export function ScanPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<VerifyDto | null>(null);
  const [handedOver, setHandedOver] = useState<string | null>(null);
  const verify = useVerifyCode();
  const collect = useCollect();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScan = useRef<{ code: string; at: number } | null>(null);

  const lookUp = useCallback(
    (raw: string) => {
      const value = raw.trim().toUpperCase();
      if (!value) return;
      setHandedOver(null);
      setResult(null);
      collect.reset();
      verify.mutate(value, { onSuccess: (r) => setResult(r) });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutate functions are stable
    [],
  );

  const camera = useQrCamera((text) => {
    const now = Date.now();
    if (lastScan.current && lastScan.current.code === text && now - lastScan.current.at < 4000) return;
    lastScan.current = { code: text, at: now };
    setCode(text.toUpperCase());
    lookUp(text);
  });

  useEffect(() => {
    if (camera === 'unavailable') inputRef.current?.focus();
  }, [camera]);

  // After a hand-over, show the tick for 3 s, then get ready for the next person
  useEffect(() => {
    if (!handedOver) return;
    const t = setTimeout(() => {
      setHandedOver(null);
      setCode('');
    }, 3000);
    return () => clearTimeout(t);
  }, [handedOver]);

  function submit(e: FormEvent) {
    e.preventDefault();
    lookUp(code);
  }

  function handOver() {
    if (!result) return;
    collect.mutate(result.order.id, {
      onSuccess: (o) => {
        setHandedOver(o.pickupCode);
        setResult(null);
      },
    });
  }

  const error = (verify.error ?? collect.error) instanceof ApiError ? ((verify.error ?? collect.error) as ApiError) : null;

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/staff/queue" className="inline-flex min-h-[44px] items-center gap-1 text-label-lg text-text-secondary hover:text-text-primary">
        <Icon name="arrow_back" size={20} /> Back to queue
      </Link>
      <h1 className="mt-1 text-headline-xl-m">Scan / verify pickup</h1>

      <div className={`relative mt-4 overflow-hidden rounded-card bg-text-primary ${camera === 'unavailable' ? 'hidden' : ''}`}>
        <div id={READER_ID} className="aspect-square w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-10 rounded-tile border-[3px] border-primary-hover/80" />
        <p className="absolute inset-x-0 bottom-3 text-center text-label-lg text-white/90">
          {camera === 'starting' ? 'Starting camera…' : 'Point the camera at the QR pass'}
        </p>
      </div>
      {camera === 'unavailable' && (
        <Alert tone="info" title="Camera not available.">Type the 6-character code from the pass instead.</Alert>
      )}

      <form onSubmit={submit} className="mt-4 flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="pickup-code" className="mb-1.5 block text-label-lg">Pickup code</label>
          <input
            ref={inputRef}
            id="pickup-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            placeholder="K7Q4MZ"
            aria-describedby="pickup-code-hint"
            className="block min-h-[56px] w-full rounded-btn border border-border-sand-strong bg-white px-4 font-mono text-[28px] uppercase tracking-[0.3em] tabular focus:border-[1.5px] focus:border-primary focus:shadow-focus focus:outline-none"
          />
          <p id="pickup-code-hint" className="mt-1 text-body-sm text-text-secondary">Or type the 6-character code</p>
        </div>
        <Button type="submit" size="xl" loading={verify.isPending} className="mb-6">Find</Button>
      </form>

      <div aria-live="assertive" className="mt-4 space-y-4">
        {error && (
          <div role="alert" className="flex items-center gap-3 rounded-card border-2 border-error bg-error-bg p-5 text-error-text">
            <Icon name="error" size={32} />
            <p className="text-headline-md">{error.code === 'NOT_FOUND' ? 'Code not found' : error.message}</p>
          </div>
        )}

        {handedOver && (
          <div role="status" className="flex flex-col items-center gap-2 rounded-card bg-primary-tint p-8 text-primary-active">
            <SuccessCheck size={140} />
            <p className="text-headline-lg">Handed over</p>
            <p className="font-mono text-body-lg tracking-widest">{handedOver}</p>
          </div>
        )}

        {result && (
          <>
            {result.warning === 'NOT_READY' && (
              <Alert tone="warning" title="Not marked ready yet.">You can still hand it over.</Alert>
            )}
            <Ticket>
              <div className="flex items-center justify-between p-4">
                <span className="font-mono text-ticket-code-lg tabular">{result.order.pickupCode}</span>
                <StatusBadge status={result.order.status} />
              </div>
              <div className="p-4">
                <p className="text-headline-md">{result.order.employeeName}</p>
                <p className="text-body-md text-text-secondary">
                  {result.order.department ? `${result.order.department} · ` : ''}Slot <span className="font-mono">{result.order.slotStart}–{result.order.slotEnd}</span>
                </p>
                <ul className="mt-3 space-y-1">
                  {result.order.items.map((i) => (
                    <li key={i.name} className="flex items-center gap-2 text-body-lg">
                      {i.diet && <DietMarker diet={i.diet} />}
                      <span className="font-mono tabular">{i.qty} ×</span> {i.name}
                    </li>
                  ))}
                </ul>
              </div>
            </Ticket>
            <Button size="xl" fullWidth icon="takeout_dining" loading={collect.isPending} onClick={handOver}>
              HAND OVER
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
