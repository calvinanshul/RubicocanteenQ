import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'tint' | 'ghost' | 'danger' | 'dark';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active',
  secondary: 'bg-white text-text-primary border border-border-sand-strong hover:bg-surface-card-warm active:bg-border-sand',
  tint: 'bg-primary-tint text-primary-active border border-primary-fixed hover:bg-primary-fixed',
  ghost: 'bg-transparent text-text-primary hover:bg-border-sand',
  danger: 'bg-white text-error border border-error hover:bg-error-bg',
  dark: 'bg-text-primary text-white hover:bg-black',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3 text-label-md',
  md: 'min-h-[44px] px-4 text-label-lg',
  lg: 'min-h-[48px] px-5 text-label-lg',
  xl: 'min-h-[60px] px-6 text-headline-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, loading = false, fullWidth = false, disabled, className = '', children, type = 'button', ...rest },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-btn font-semibold transition-colors duration-150 ease-out',
        SIZES[size],
        isDisabled ? 'cursor-not-allowed bg-border-sand text-text-secondary border-transparent' : VARIANTS[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} size={20} /> : null}
      {children}
    </button>
  );
});
