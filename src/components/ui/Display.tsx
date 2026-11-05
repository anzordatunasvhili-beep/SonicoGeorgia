import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { Tone } from '@/lib/format';

const tones: Record<Tone, string> = {
  neutral: 'bg-ink/5 text-ink-500',
  ember: 'bg-ember-50 text-ember-700',
  green: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-sky-50 text-sky-700',
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-700',
  violet: 'bg-violet-50 text-violet-700',
};

export function Badge({ tone = 'neutral', icon, children, className = '' }: { tone?: Tone; icon?: string; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-ink/5 bg-white shadow-soft ${className}`}>{children}</div>;
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-ink/10 bg-white/60 px-6 py-14 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ember-50 text-ember">
        <Icon name={icon} size={28} />
      </span>
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-red-100 bg-red-50/60 px-6 py-10 text-center">
      <Icon name="cloud_off" size={32} className="text-red-500" />
      <p className="mt-3 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-red-700 hover:underline">
          <Icon name="refresh" size={18} /> Try again
        </button>
      )}
    </div>
  );
}

export function Stars({ value, size = 16, className = '' }: { value: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex text-amber-500 ${className}`} aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name={value >= i - 0.25 ? 'star' : value >= i - 0.75 ? 'star_half' : 'star'} filled={value >= i - 0.75} size={size}
          className={value >= i - 0.75 ? '' : 'text-ink/15'} />
      ))}
    </span>
  );
}

export function SectionHeading({ eyebrow, title, action, className = '' }: { eyebrow?: string; title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`mb-6 flex items-end justify-between gap-4 ${className}`}>
      <div>
        {eyebrow && <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-ember">{eyebrow}</p>}
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function StatTile({ icon, label, value, hint, tone = 'ember' }: { icon: string; label: string; value: ReactNode; hint?: string; tone?: 'ember' | 'moss' | 'ink' }) {
  const toneCls = tone === 'moss' ? 'bg-moss-50 text-moss' : tone === 'ink' ? 'bg-ink/5 text-ink' : 'bg-ember-50 text-ember';
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneCls}`}><Icon name={icon} /></span>
        <span className="text-sm text-ink-500">{label}</span>
      </div>
      <div className="mt-3 font-display text-2xl font-bold text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-400">{hint}</div>}
    </Card>
  );
}
