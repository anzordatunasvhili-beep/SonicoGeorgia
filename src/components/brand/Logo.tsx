import { Link } from 'react-router-dom';

interface LogoMarkProps {
  animated?: boolean;
  size?: number;
  className?: string;
}

const BARS = [0.45, 0.75, 1, 0.65, 0.35];

/** Equalizer mark. `animated` makes the bars dance; static is used in print, emails and favicons. */
export function LogoMark({ animated = false, size = 28, className = '' }: LogoMarkProps) {
  const w = size;
  const barW = w / 9;
  return (
    <svg width={w} height={w} viewBox={`0 0 ${w} ${w}`} className={className} aria-hidden="true">
      {BARS.map((h, i) => {
        const bh = w * 0.8 * h;
        return (
          <rect
            key={i}
            x={barW * (i * 1.8 + 0.4)}
            y={(w - bh) / 2}
            width={barW}
            height={bh}
            rx={barW / 2}
            fill="currentColor"
            style={animated ? {
              transformOrigin: 'center',
              transformBox: 'fill-box',
              animation: `eq ${0.9 + (i % 3) * 0.18}s ease-in-out ${i * 0.12}s infinite`,
            } : undefined}
          />
        );
      })}
    </svg>
  );
}

interface LogoProps {
  animated?: boolean;
  tone?: 'dark' | 'light';
  to?: string | null;
  className?: string;
}

export function Logo({ animated = false, tone = 'dark', to = '/', className = '' }: LogoProps) {
  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark animated={animated} className="text-ember" />
      <span className={`font-display text-xl font-bold tracking-[0.18em] ${tone === 'light' ? 'text-white' : 'text-ink'}`}>
        SONICO
      </span>
    </span>
  );
  return to ? <Link to={to} aria-label="Sonico home">{content}</Link> : content;
}
