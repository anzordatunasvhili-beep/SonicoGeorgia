import type { CSSProperties } from 'react';

interface IconProps {
  name: string;          // Material Symbols ligature name, e.g. "shopping_bag"
  size?: number;
  filled?: boolean;
  weight?: 300 | 400 | 500 | 600;
  className?: string;
  style?: CSSProperties;
  label?: string;        // when set, the icon is announced; otherwise decorative
}

/** The single icon primitive for the whole UI (Google Material Symbols Rounded). */
export function Icon({ name, size = 22, filled = false, weight = 400, className = '', style, label }: IconProps) {
  return (
    <span
      className={`material-symbols-rounded select-none leading-none ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${Math.min(48, Math.max(20, size))}`,
        ...style,
      }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      {name}
    </span>
  );
}
