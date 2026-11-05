import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { ButtonLink } from '@/components/ui/Button';
import { HeroHeadphones } from './HeroHeadphones';
import type { Product } from '@/lib/types';

const CALLOUTS = [
  { icon: 'noise_control_off', label: 'Adaptive\nNoise Cancelling', pos: 'left-[2%] top-[18%]', line: 'right' },
  { icon: 'bed', label: 'Premium\nMemory Foam', pos: 'right-[0%] top-[10%]', line: 'left' },
  { icon: 'graphic_eq', label: 'Hi-Res\nSound Quality', pos: 'right-[-2%] top-[55%]', line: 'left' },
] as const;

export function Hero({ spotlight }: { spotlight?: Product | null }) {
  const productLink = spotlight ? `/product/${spotlight.slug}` : '/shop/headphones';
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative mt-4 overflow-hidden rounded-4xl bg-gradient-to-br from-white via-paper-50 to-paper-200 shadow-soft">
          {/* giant watermark */}
          <span className="pointer-events-none absolute inset-x-0 top-6 select-none text-center font-display text-[22vw] font-bold leading-none tracking-tighter text-ink/[0.035] lg:text-[260px]" aria-hidden="true">
            SONICO
          </span>

          <div className="relative grid min-h-[560px] items-center gap-6 px-6 py-12 sm:px-12 lg:grid-cols-[1fr_1.15fr] lg:py-6">
            <div className="z-10 max-w-lg">
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 font-semibold uppercase tracking-[0.2em] text-ember">
                New arrival
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                className="font-display text-5xl font-bold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-7xl"
              >
                Hear Beyond<br />Limits.
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-5 max-w-sm text-ink-500">
                Engineered for those who demand more from every beat — headphones, speakers and listening objects co-designed with independent creators.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="mt-8 flex flex-wrap items-center gap-3">
                <Link to={productLink} className="group inline-flex items-center gap-3 rounded-full border border-ink/10 bg-white py-1.5 pl-5 pr-1.5 text-sm font-semibold shadow-soft transition hover:shadow-lift">
                  Explore now
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ember text-white transition group-hover:translate-x-0.5">
                    <Icon name="arrow_forward" size={20} />
                  </span>
                </Link>
                <ButtonLink to="/shop" variant="ghost">Shop all</ButtonLink>
              </motion.div>
              <div className="mt-10 flex flex-wrap gap-5 text-xs text-ink-500">
                <span className="flex items-center gap-1.5"><Icon name="verified" size={18} className="text-ember" />2-year warranty</span>
                <span className="flex items-center gap-1.5"><Icon name="local_shipping" size={18} className="text-ember" />Free shipping over ₾150</span>
                <span className="flex items-center gap-1.5"><Icon name="design_services" size={18} className="text-ember" />Creator-designed</span>
              </div>
            </div>

            <div className="relative mx-auto aspect-square w-full max-w-[560px]">
              <HeroHeadphones className="absolute inset-[6%] h-[88%] w-[88%]" />
              {CALLOUTS.map((c, i) => (
                <motion.div
                  key={c.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.15 }}
                  className={`absolute hidden items-center gap-2 sm:flex ${c.pos} ${c.line === 'right' ? 'flex-row-reverse text-right' : ''}`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ember shadow-soft ring-1 ring-ember/20">
                    <Icon name={c.icon} size={18} />
                  </span>
                  <span className="whitespace-pre-line text-xs font-medium leading-tight text-ink-700">{c.label}</span>
                </motion.div>
              ))}

              {spotlight && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="absolute bottom-[4%] right-[4%]">
                  <Link to={productLink} className="flex items-center gap-3 rounded-2xl bg-ink py-2 pl-2 pr-5 text-white shadow-lift transition hover:bg-ink-700">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-ember to-ember-700"><Icon name="bolt" filled /></span>
                    <span className="text-left text-[11px] uppercase leading-tight tracking-wider text-white/60">
                      Engineered<br /><span className="text-white">for performance</span>
                    </span>
                  </Link>
                </motion.div>
              )}
            </div>
          </div>

          <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col gap-2 xl:flex" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === 1 ? 'bg-ember' : 'bg-ink/15'}`} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
