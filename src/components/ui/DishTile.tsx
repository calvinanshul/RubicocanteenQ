import { CATEGORY_LABELS, type Category } from '@/shared';
import { initials } from '../../lib/format';

const PALETTE = ['#FDE4D3', '#E7F0DC', '#FCEFC7', '#E3ECF5', '#F4E1EC', '#E9E3F5', '#DDF0EE'];
const INK = ['#9A3412', '#3F6212', '#92400E', '#1E3A5F', '#831843', '#4C1D95', '#115E59'];

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Rounded square with dish initials + category label, colour per dish (no photos in the MVP). */
export function DishTile({ name, category, size = 56 }: { name: string; category: Category; size?: number }) {
  const i = hash(name) % PALETTE.length;
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, backgroundColor: PALETTE[i], color: INK[i] }}
      className="inline-flex shrink-0 flex-col items-center justify-center rounded-tile"
    >
      <span className="font-bold leading-none" style={{ fontSize: Math.round(size * 0.32) }}>
        {initials(name)}
      </span>
      {size >= 52 && <span className="mt-1 text-[9px] font-bold tracking-wider opacity-80">{CATEGORY_LABELS[category]}</span>}
    </span>
  );
}
