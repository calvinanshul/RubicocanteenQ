export function Spinner({ className = '', label }: { className?: string; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} className={`inline-flex items-center ${className}`}>
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
