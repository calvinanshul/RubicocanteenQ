import { useId } from 'react';

interface SuccessCheckProps {
  /** Rendered width and height in px. */
  size?: number;
  className?: string;
}

/**
 * Animated success tick: pops in, draws its ring and check, with a looping sparkle burst.
 * Used when an order is placed (S5) and when staff hand an order over (S8).
 * Decorative only: the surrounding heading or status text carries the meaning.
 * Keyframes live in styles/index.css (`success-check-*`); reduced motion shows the final tick with no sparkles.
 */
export function SuccessCheck({ size = 96, className = '' }: SuccessCheckProps) {
  // Gradient ids must be unique per instance; useId's colons are stripped to keep url(#…) safe.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const warm = `sc-warm-${uid}`;
  const glow = `sc-glow-${uid}`;
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      data-testid="success-check"
      className={`success-check shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id={warm} x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
        <linearGradient id={glow} x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#ffedd5" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fed7aa" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <g className="success-check__sparkle">
        <circle cx="100" cy="24" fill="#ea580c" r="4" />
        <circle cx="168" cy="54" fill="#f97316" r="3.5" />
        <circle cx="178" cy="120" fill="#ea580c" r="4.5" />
        <circle cx="148" cy="172" fill="#fb923c" r="3" />
        <circle cx="52" cy="172" fill="#ea580c" r="4" />
        <circle cx="22" cy="116" fill="#f97316" r="3" />
        <circle cx="34" cy="50" fill="#ea580c" r="4.5" />
      </g>
      <circle cx="100" cy="100" r="78" fill={`url(#${glow})`} />
      <circle className="success-check__ring" cx="100" cy="100" r="68" fill="none" stroke="#ea580c" strokeLinecap="round" strokeWidth="4" />
      <circle className="success-check__disc" cx="100" cy="100" r="58" fill={`url(#${warm})`} />
      <path
        className="success-check__tick"
        d="M72 102 L91 121 L130 81"
        fill="none"
        stroke="#ffffff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="8"
      />
    </svg>
  );
}
