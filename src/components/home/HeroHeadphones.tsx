import { motion } from 'framer-motion';

/** Vector hero illustration (no 3D on the landing page — models load only on product pages). */
export function HeroHeadphones({ className = '' }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 520 520"
      className={className}
      initial={{ opacity: 0, y: 30, rotate: -6 }}
      animate={{ opacity: 1, y: [0, -10, 0], rotate: -6 }}
      transition={{ opacity: { duration: 0.8 }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="band" x1="0" x2="1">
          <stop offset="0" stopColor="#E9E3D9" />
          <stop offset=".5" stopColor="#FBF8F3" />
          <stop offset="1" stopColor="#D8D0C3" />
        </linearGradient>
        <radialGradient id="metal" cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".35" stopColor="#C9CDD2" />
          <stop offset=".7" stopColor="#7D838B" />
          <stop offset="1" stopColor="#3B3F45" />
        </radialGradient>
        <radialGradient id="cushion" cx=".4" cy=".35" r=".8">
          <stop offset="0" stopColor="#F3EEE6" />
          <stop offset="1" stopColor="#B8AE9E" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="24" stdDeviation="20" floodColor="#0F0F10" floodOpacity=".22" />
        </filter>
      </defs>

      <g filter="url(#shadow)">
        {/* headband */}
        <path d="M110 300 C 100 110, 420 110, 410 300" fill="none" stroke="#2A2A2E" strokeWidth="14" strokeLinecap="round" />
        <path d="M120 290 C 115 130, 405 130, 400 290" fill="none" stroke="url(#band)" strokeWidth="34" strokeLinecap="round" />
        {/* yokes */}
        <rect x="96" y="270" width="26" height="70" rx="10" fill="#2A2A2E" />
        <rect x="398" y="270" width="26" height="70" rx="10" fill="#2A2A2E" />

        {/* back cup */}
        <ellipse cx="128" cy="370" rx="62" ry="86" fill="url(#cushion)" />
        <ellipse cx="140" cy="370" rx="44" ry="66" fill="#2A2A2E" />

        {/* front cup */}
        <ellipse cx="390" cy="372" rx="98" ry="110" fill="url(#cushion)" />
        <ellipse cx="400" cy="372" rx="84" ry="96" fill="#1A1A1C" />
        <motion.ellipse
          cx="402" cy="372" rx="78" ry="90" fill="none" stroke="#FF7A1A" strokeWidth="7" filter="url(#glow)"
          animate={{ opacity: [0.65, 1, 0.65] }} transition={{ duration: 2.4, repeat: Infinity }}
        />
        <ellipse cx="404" cy="372" rx="70" ry="81" fill="url(#metal)" />
        {Array.from({ length: 10 }).map((_, i) => (
          <ellipse key={i} cx="404" cy="372" rx={68 - i * 6} ry={79 - i * 7} fill="none" stroke="#ffffff" strokeOpacity={0.08} />
        ))}
        <text x="404" y="378" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="16" letterSpacing="4" fill="#1A1A1C" fillOpacity=".75">SONICO</text>
      </g>
    </motion.svg>
  );
}
