interface IconProps {
  name: string;
  filled?: boolean;
  size?: number;
  className?: string;
}

/** Material Symbols Outlined. Always decorative: pair with visible text or an aria-label on the control. */
export function Icon({ name, filled = false, size, className = '' }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
      style={{
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        ...(size ? { fontSize: size } : {}),
      }}
    >
      {name}
    </span>
  );
}
