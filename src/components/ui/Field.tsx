import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Icon } from './Icon';

function inputClasses(error?: string, hasIcon?: boolean) {
  return [
    'block w-full min-h-[44px] rounded-btn bg-white px-3 text-body-lg text-text-primary placeholder:text-text-secondary/70',
    'disabled:bg-surface-cream disabled:text-text-secondary',
    'focus:outline-none focus-visible:outline-none',
    error
      ? 'border-[1.5px] border-error focus:shadow-[0_0_0_3px_#FFDAD6]'
      : 'border border-border-sand-strong focus:border-[1.5px] focus:border-primary focus:shadow-focus',
    hasIcon ? 'pl-10' : '',
  ].join(' ');
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1 text-body-sm text-error">
      <Icon name="error" size={16} />
      <span>{message}</span>
    </p>
  );
}

interface FieldShellProps {
  label: string;
  id: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  trailingLabel?: ReactNode;
}

function FieldShell({ label, id, error, hint, children, trailingLabel }: FieldShellProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-label-lg text-text-primary">
          {label}
        </label>
        {trailingLabel}
      </div>
      {children}
      {error ? <FieldError id={`${id}-error`} message={error} /> : hint ? <div id={`${id}-hint`} className="mt-1.5 text-body-sm text-text-secondary">{hint}</div> : null}
    </div>
  );
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  icon?: string;
  trailing?: ReactNode;
  trailingLabel?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, icon, trailing, trailingLabel, id, className = '', 'aria-describedby': extraDescribedBy, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  // Merge the field's own error/hint id with any caller-supplied ids instead of replacing it (BUG-01-002).
  const ownDescription = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  const describedBy = [ownDescription, extraDescribedBy].filter(Boolean).join(' ') || undefined;
  return (
    <FieldShell label={label} id={inputId} error={error} hint={hint} trailingLabel={trailingLabel}>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            <Icon name={icon} size={20} />
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${inputClasses(error, Boolean(icon))} ${trailing ? 'pr-12' : ''} ${className}`}
          {...rest}
        />
        {trailing && <div className="absolute right-1 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
    </FieldShell>
  );
});

export const PasswordField = forwardRef<HTMLInputElement, Omit<TextFieldProps, 'type' | 'trailing'>>(
  function PasswordField(props, ref) {
    const [shown, setShown] = useState(false);
    return (
      <TextField
        ref={ref}
        type={shown ? 'text' : 'password'}
        icon="lock"
        trailing={
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? 'Hide password' : 'Show password'}
            aria-pressed={shown}
            className="flex h-10 w-10 items-center justify-center rounded-btn text-text-secondary hover:bg-border-sand"
          >
            <Icon name={shown ? 'visibility_off' : 'visibility'} size={20} />
          </button>
        }
        {...props}
      />
    );
  },
);

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, id, children, className = '', 'aria-describedby': extraDescribedBy, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const describedBy = [error ? `${selectId}-error` : undefined, extraDescribedBy].filter(Boolean).join(' ') || undefined;
  return (
    <FieldShell label={label} id={selectId} error={error} hint={hint}>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${inputClasses(error)} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236E5D53'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")] bg-[length:20px] bg-[right_10px_center] bg-no-repeat pr-9 ${className}`}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
});

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  tone?: 'primary' | 'green';
  showLabel?: boolean;
}

export function Switch({ checked, onChange, label, disabled, tone = 'primary', showLabel = false }: SwitchProps) {
  const on = tone === 'green' ? 'bg-veg' : 'bg-primary';
  return (
    <label className={`inline-flex min-h-[44px] items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={showLabel ? undefined : label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ${checked ? on : 'bg-border-sand-strong'}`}
      >
        <span
          className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
        />
      </button>
      {showLabel && <span className="text-label-lg">{label}</span>}
    </label>
  );
}

export function Checkbox({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-body-md">
      <input type="checkbox" className="h-5 w-5 accent-primary" {...rest} />
      {label}
    </label>
  );
}
