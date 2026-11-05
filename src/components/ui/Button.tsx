import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';

type Variant = 'primary' | 'dark' | 'outline' | 'ghost' | 'danger' | 'moss';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50 active:scale-[.98]';

const variants: Record<Variant, string> = {
  primary: 'bg-ember text-white shadow-glow hover:bg-ember-600',
  dark: 'bg-ink text-white hover:bg-ink-700',
  moss: 'bg-moss text-white hover:bg-moss-600',
  outline: 'border border-ink/15 bg-white text-ink hover:border-ink/40',
  ghost: 'text-ink hover:bg-ink/5',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
};

interface Common {
  variant?: Variant;
  size?: Size;
  icon?: string;
  iconRight?: string;
  loading?: boolean;
  children?: ReactNode;
  className?: string;
}

export const Button = forwardRef<HTMLButtonElement, Common & ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ variant = 'primary', size = 'md', icon, iconRight, loading, children, className = '', disabled, ...rest }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Icon name="progress_activity" className="animate-spin" size={18} /> : icon && <Icon name={icon} size={18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={18} />}
    </button>
  ),
);
Button.displayName = 'Button';

export function ButtonLink({ to, variant = 'primary', size = 'md', icon, iconRight, children, className = '' }: Common & { to: string }) {
  return (
    <Link to={to} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {icon && <Icon name={icon} size={18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={18} />}
    </Link>
  );
}

export function IconButton({ icon, label, className = '', badge, ...rest }: { icon: string; label: string; badge?: number } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember ${className}`}
      {...rest}
    >
      <Icon name={icon} />
      {!!badge && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ember px-1 text-[11px] font-bold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
