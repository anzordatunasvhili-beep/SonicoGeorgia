import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { ModelPreset, Product } from '@/lib/types';

const PRESET_ICON: Record<ModelPreset, string> = {
  headphones: 'headphones',
  earbuds: 'earbuds',
  speaker: 'speaker',
  turntable: 'album',
  keyboard: 'piano',
  radio: 'radio',
  generic: 'graphic_eq',
};

type MediaProduct = Pick<Product, 'name' | 'images' | 'accent_color' | 'model_preset'>;

/**
 * Product image, or — before photography is uploaded — a branded tile built from the
 * product's accent colour and type icon (never a stock or fake photo).
 */
export function ProductMedia({ product, index = 0, iconSize = 64, className = '' }: { product: MediaProduct; index?: number; iconSize?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = product.images?.[index];

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={product.name}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  const accent = product.accent_color || '#FF7A1A';
  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
      style={{ background: `radial-gradient(120% 90% at 30% 20%, #ffffff 0%, ${accent}1f 55%, ${accent}38 100%)` }}
      role="img"
      aria-label={product.name}
    >
      <div className="absolute inset-[18%] rounded-full border border-white/70" />
      <div className="absolute inset-[30%] rounded-full border border-white/50" />
      <Icon name={PRESET_ICON[product.model_preset ?? 'generic']} size={iconSize} weight={300} style={{ color: accent }} className="relative drop-shadow-sm" />
    </div>
  );
}
