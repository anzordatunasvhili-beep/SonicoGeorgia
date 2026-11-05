import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Hero } from '@/components/home/Hero';
import { Container } from '@/components/layout/Layout';
import { Newsletter } from '@/components/layout/Footer';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import { SectionHeading, Stars, Card } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { ButtonLink } from '@/components/ui/Button';
import { useQuery } from '@/lib/useQuery';
import { fetchCategories, fetchDeals, fetchFeatured, fetchLatestReviews } from '@/lib/catalog';
import { date } from '@/lib/format';

export default function Home() {
  const categories = useQuery(fetchCategories, []);
  const featured = useQuery(() => fetchFeatured(10), []);
  const deals = useQuery(() => fetchDeals(10), []);
  const reviews = useQuery(() => fetchLatestReviews(3), []);

  return (
    <>
      <Hero spotlight={featured.data?.[0]} />

      {/* Categories */}
      <Container className="mt-10">
        <div className="flex gap-3 overflow-x-auto pb-2 sm:justify-between [&::-webkit-scrollbar]:hidden">
          {(categories.data ?? []).map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link to={`/shop/${c.slug}`} className="group flex w-24 shrink-0 flex-col items-center gap-2 text-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-soft ring-4 ring-transparent transition group-hover:-translate-y-1 group-hover:ring-ember/15"
                  style={{ background: `radial-gradient(circle at 30% 25%, #fff, ${c.accent}22)` }}>
                  <Icon name={c.icon} size={32} weight={300} style={{ color: c.accent }} />
                </span>
                <span className="text-xs font-semibold text-ink">{c.name}</span>
              </Link>
            </motion.div>
          ))}
          {categories.data && (
            <Link to="/shop" className="group flex w-24 shrink-0 flex-col items-center gap-2 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-soft transition group-hover:-translate-y-1">
                <Icon name="apps" size={30} />
              </span>
              <span className="text-xs font-semibold">View all</span>
            </Link>
          )}
        </div>
      </Container>

      {/* Featured */}
      <Container className="mt-16">
        <Rail title={<>Top picks for you <Icon name="auto_awesome" filled className="text-ember" /></>} eyebrow="Featured" link="/shop" loading={featured.loading}>
          {(featured.data ?? []).map((p, i) => <div key={p.id} className="w-[220px] shrink-0 snap-start sm:w-[250px]"><ProductCard product={p} index={i} /></div>)}
        </Rail>
      </Container>

      {/* Promo tiles */}
      <Container className="mt-14 grid gap-4 md:grid-cols-3">
        <PromoTile eyebrow="Vinyl revival" title="Floating turntables" to="/shop/turntables" icon="album" bg="bg-[#EFE8F7]" accent="#9B51E0" />
        <PromoTile eyebrow="Room filling" title="Speakers that sculpt sound" to="/shop/speakers" icon="speaker" bg="bg-[#E3EEFB]" accent="#2F80ED" />
        <PromoTile eyebrow="Make music" title="Keys, synths & looping" to="/shop/keyboards" icon="piano" bg="bg-[#E4F3E9]" accent="#27AE60" />
      </Container>

      {/* Deals */}
      {(deals.loading || (deals.data?.length ?? 0) > 0) && (
        <Container className="mt-16">
          <Rail title="Deals worth hearing" eyebrow="Limited prices" link="/shop?sale=1" loading={deals.loading}>
            {(deals.data ?? []).map((p, i) => <div key={p.id} className="w-[220px] shrink-0 snap-start sm:w-[250px]"><ProductCard product={p} index={i} /></div>)}
          </Rail>
        </Container>
      )}

      {/* Creators band */}
      <Container className="mt-16">
        <div className="relative overflow-hidden rounded-4xl bg-ink px-6 py-12 text-white sm:px-12">
          <div className="pointer-events-none absolute -right-20 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full"
            style={{ background: 'repeating-radial-gradient(circle, #1f1f22 0 3px, #151517 3px 6px)' }} />
          <div className="pointer-events-none absolute right-[140px] top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-ember" />
          <div className="relative max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Sonico Creators</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Design it. We build it. You earn from every sale.</h2>
            <p className="mt-4 text-white/70">
              Submit original product designs. Approved designs are manufactured and sold under the Sonico brand, and you receive an agreed royalty on eligible sales.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/creators" iconRight="arrow_forward">How it works</ButtonLink>
              <ButtonLink to="/creators/apply" variant="outline" className="!border-white/20 !bg-transparent !text-white hover:!border-white/50">Apply now</ButtonLink>
            </div>
          </div>
        </div>
      </Container>

      {/* Reviews (real, verified-buyer reviews only) */}
      {(reviews.data?.length ?? 0) > 0 && (
        <Container className="mt-16">
          <SectionHeading eyebrow="Verified buyers" title={<>Loved by listeners <Icon name="favorite" filled className="text-red-400" /></>} />
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.data!.map((r) => (
              <Card key={r.id} className="p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ember-50 font-display font-bold text-ember">
                    {r.author_name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="flex items-center gap-1 font-semibold">{r.author_name}<Icon name="verified" filled size={16} className="text-moss" /></p>
                    <Stars value={r.rating} size={14} />
                  </div>
                </div>
                {r.title && <p className="mt-4 font-semibold">{r.title}</p>}
                <p className="mt-2 line-clamp-4 text-sm text-ink-500">“{r.body}”</p>
                <p className="mt-4 text-xs text-ink-400">
                  {r.product && <Link to={`/product/${r.product.slug}`} className="font-medium text-ink-700 hover:text-ember">{r.product.name}</Link>} · {date(r.created_at)}
                </p>
              </Card>
            ))}
          </div>
        </Container>
      )}

      <Container className="mt-16">
        <Newsletter />
      </Container>
    </>
  );
}

function Rail({ title, eyebrow, link, loading, children }: { title: React.ReactNode; eyebrow: string; link: string; loading: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * 520, behavior: 'smooth' });
  return (
    <section className="rounded-4xl bg-white/60 p-4 sm:p-6">
      <SectionHeading
        eyebrow={eyebrow}
        title={<span className="inline-flex items-center gap-2">{title}</span>}
        action={
          <div className="flex items-center gap-2">
            <Link to={link} className="mr-2 hidden items-center gap-1 text-sm font-semibold text-ink hover:text-ember sm:inline-flex">See all<Icon name="arrow_forward" size={18} /></Link>
            <button onClick={() => scroll(-1)} aria-label="Scroll left" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-soft hover:bg-ink hover:text-white"><Icon name="chevron_left" /></button>
            <button onClick={() => scroll(1)} aria-label="Scroll right" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-soft hover:bg-ink hover:text-white"><Icon name="chevron_right" /></button>
          </div>
        }
      />
      <div ref={ref} className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3 [&::-webkit-scrollbar]:hidden">
        {loading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="w-[220px] shrink-0 sm:w-[250px]"><ProductCardSkeleton /></div>) : children}
      </div>
    </section>
  );
}

function PromoTile({ eyebrow, title, to, icon, bg, accent }: { eyebrow: string; title: string; to: string; icon: string; bg: string; accent: string }) {
  return (
    <Link to={to} className={`group relative flex min-h-[180px] overflow-hidden rounded-3xl p-6 ${bg}`}>
      <div className="relative z-10 flex max-w-[60%] flex-col">
        <span className="text-xs font-semibold text-ink-500">{eyebrow}</span>
        <span className="mt-1 font-display text-2xl font-bold leading-tight text-ink">{title}</span>
        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold">Shop now<Icon name="arrow_forward" size={18} className="transition group-hover:translate-x-1" /></span>
      </div>
      <Icon name={icon} size={150} weight={300} className="absolute -bottom-6 -right-4 opacity-80 transition duration-500 group-hover:-rotate-6 group-hover:scale-105" style={{ color: accent }} />
    </Link>
  );
}
