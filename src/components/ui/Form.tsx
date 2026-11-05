import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Icon } from './Icon';

const control =
  'w-full rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-400 ' +
  'transition focus:border-ember focus:outline-none focus:ring-4 focus:ring-ember/15 disabled:bg-paper-100';

export function Field({ label, hint, error, children, className = '' }: {
  label?: string; hint?: string; error?: string | null; children: ReactNode; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1.5 flex items-center gap-1 text-xs text-red-600"><Icon name="error" size={14} />{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-ink-400">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { icon?: string }>(
  ({ className = '', icon, ...rest }, ref) =>
    icon ? (
      <span className="relative block">
        <Icon name={icon} size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input ref={ref} className={`${control} pl-11 ${className}`} {...rest} />
      </span>
    ) : (
      <input ref={ref} className={`${control} ${className}`} {...rest} />
    ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', rows = 4, ...rest }, ref) => <textarea ref={ref} rows={rows} className={`${control} resize-y ${className}`} {...rest} />,
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, ...rest }, ref) => (
    <span className="relative block">
      <select ref={ref} className={`${control} appearance-none pr-10 ${className}`} {...rest}>{children}</select>
      <Icon name="expand_more" size={20} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
    </span>
  ),
);
Select.displayName = 'Select';

export function Checkbox({ label, ...rest }: { label: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="group flex w-fit cursor-pointer select-none items-start gap-3 text-sm text-ink">
      <input type="checkbox" className="peer sr-only" {...rest} />
      <span
        aria-hidden="true"
        className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] border-ink/20 bg-white text-white transition
          group-hover:border-ink/40 peer-checked:border-ember peer-checked:bg-ember
          peer-focus-visible:ring-4 peer-focus-visible:ring-ember/20 peer-disabled:opacity-50
          [&>span]:scale-0 [&>span]:transition-transform peer-checked:[&>span]:scale-100"
      >
        <Icon name="check" size={16} className="font-bold" />
      </span>
      <span className="leading-5">{label}</span>
    </label>
  );
}

export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <Icon name="error" size={18} className="mt-px" />
      <span>{message}</span>
    </div>
  );
}
