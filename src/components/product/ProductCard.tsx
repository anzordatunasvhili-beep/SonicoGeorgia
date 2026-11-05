import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Product } from '@/lib/types';
import { discountPct, money } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { Stars } from '@/components/ui/Display';
import { useCart } from '@/context/CartContext';
import { ProductMedia } from './ProductMedia';

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { add } = useCart();
  const off = discountPct(product.price, product.compare_at_price);
  const soldOut = product.stock <= 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.05 }}
      className="group relative flex flex-col rounded-3xl bg-white p-3 shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
    >
      <Link to={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden rounded-2xl bg-paper-100">
        <div className="h-full w-full transition duration-500 group-hover:scale-105">
          <ProductMedia product={product} />
        </div>
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {off > 0 && <span className="rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white">-{off}%</span>}
          {product.is_new && <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-white">NEW</span>}
        </div>
        {product.creator_id && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-moss backdrop-blur">
            <Icon name="design_services" size={14} />Creator
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
        {product.category && <span className="text-[11px] font-medium uppercase tracking-wider text-ink-400">{product.category.name}</span>}
        <Link to={`/product/${product.slug}`} className="mt-0.5 line-clamp-1 font-semibold text-ink hover:text-ember">{product.name}</Link>
        {product.rating_count > 0 && (
          <span className="mt-1 flex items-center gap-1 text-xs text-ink-400">
            <Stars value={Number(product.rating_avg)} size={14} />({product.rating_count})
          </span>
        )}
        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <span className="text-lg font-bold text-ink">{money(product.price, product.currency)}</span>
            {off > 0 && <span className="ml-2 text-xs text-ink-400 line-through">{money(product.compare_at_price!, product.currency)}</span>}
          </div>
          <button
            onClick={() => add(product.id)}
            disabled={soldOut}
            aria-label={soldOut ? `${product.name} is sold out` : `Add ${product.name} to bag`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-moss text-white transition hover:bg-ember disabled:bg-ink/10 disabled:text-ink-400"
          >
            <Icon name={soldOut ? 'block' : 'add_shopping_cart'} size={20} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl bg-white p-3 shadow-soft">
      <div className="aspect-square rounded-2xl bg-paper-200" />
      <div className="mt-3 h-3 w-1/3 rounded bg-paper-200" />
      <div className="mt-2 h-4 w-2/3 rounded bg-paper-200" />
      <div className="mt-6 h-5 w-1/4 rounded bg-paper-200" />
    </div>
  );
}

export function ProductGrid({ products, loading, cols = 4 }: { products: Product[]; loading?: boolean; cols?: 3 | 4 | 5 }) {
  const colCls = cols === 5 ? 'lg:grid-cols-5' : cols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';
  return (
    <div className={`grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 ${colCls}`}>
      {loading
        ? Array.from({ length: cols * 2 }).map((_, i) => <ProductCardSkeleton key={i} />)
        : products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
    </div>
  );
}
