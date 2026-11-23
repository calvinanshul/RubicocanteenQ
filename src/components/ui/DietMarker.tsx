import type { Diet } from '@/shared';

const LABEL: Record<Diet, string> = { VEG: 'Veg', NON_VEG: 'Non-veg', JAIN: 'Jain (veg)' };

/** FSSAI diet marker: shape + colour + aria-label (UI spec §3, §7). Jain uses the veg marker. */
export function DietMarker({ diet, className = '' }: { diet: Diet; className?: string }) {
  const veg = diet !== 'NON_VEG';
  return (
    <span
      role="img"
      aria-label={LABEL[diet]}
      title={LABEL[diet]}
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border-[1.5px] bg-white ${veg ? 'border-veg' : 'border-non-veg'} ${className}`}
    >
      {veg ? (
        <span className="h-1.5 w-1.5 rounded-full bg-veg" />
      ) : (
        <span className="h-0 w-0 border-x-[4px] border-b-[7px] border-x-transparent border-b-non-veg" />
      )}
    </span>
  );
}
