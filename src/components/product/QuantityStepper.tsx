import { Icon } from '@/components/ui/Icon';

export function QuantityStepper({ value, onChange, min = 1, max = 20, small = false }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; small?: boolean;
}) {
  const h = small ? 'h-8' : 'h-11';
  const w = small ? 'w-8' : 'w-11';
  return (
    <div className={`inline-flex items-center rounded-full border border-ink/10 bg-white ${h}`}>
      <button type="button" className={`flex ${h} ${w} items-center justify-center rounded-full text-ink hover:bg-ink/5 disabled:opacity-30`}
        onClick={() => onChange(value - 1)} disabled={value <= (min === 1 && small ? 0 : min)} aria-label="Decrease quantity">
        <Icon name="remove" size={small ? 16 : 20} />
      </button>
      <span className={`min-w-6 text-center font-semibold ${small ? 'text-sm' : ''}`} aria-live="polite">{value}</span>
      <button type="button" className={`flex ${h} ${w} items-center justify-center rounded-full text-ink hover:bg-ink/5 disabled:opacity-30`}
        onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Icon name="add" size={small ? 16 : 20} />
      </button>
    </div>
  );
}
