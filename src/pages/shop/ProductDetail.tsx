import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Container } from '@/components/layout/Layout';
import { ProductMedia } from '@/components/product/ProductMedia';
import { ImageLightbox } from '@/components/product/ImageLightbox';
import { ProductGrid } from '@/components/product/ProductCard';
import { QuantityStepper } from '@/components/product/QuantityStepper';
import { Badge, Card, EmptyState, ErrorState, SectionHeading, Stars } from '@/components/ui/Display';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Field, FormError, Input, Textarea } from '@/components/ui/Form';
import { Loader, PageLoader } from '@/components/brand/Loader';
import { useQuery } from '@/lib/useQuery';
import { fetchCreatorProfile, fetchProductBySlug, fetchRelated, fetchReviews } from '@/lib/catalog';
import { date, discountPct, money } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import type { Product } from '@/lib/types';

// three.js + the model are only downloaded when a product page opens the 3D view.
const ProductViewer3D = lazy(() => import('@/components/product/three/ProductViewer3D'));

export default function ProductDetail() {
  const { slug = '' } = useParams();
  const product = useQuery(() => fetchProductBySlug(slug), [slug]);

  if (product.loading) return <PageLoader />;
  if (product.error) return <Container className="py-20"><ErrorState message={product.error} onRetry={product.reload} /></Container>;
  if (!product.data) {
    return <Container className="py-20"><EmptyState icon="search_off" title="Product not found" action={<Link to="/shop" className="font-semibold text-ember">Back to shop</Link>} /></Container>;
  }
  return <ProductView product={product.data} />;
}

function ViewTab({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={active} className="group flex flex-col items-center gap-1.5">
      <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft ring-2 transition ${active ? 'text-ember ring-ember' : 'text-ink-500 ring-transparent group-hover:text-ink'}`}>
        <Icon name={icon} size={24} />
      </span>
      <span className={`text-xs font-semibold ${active ? 'text-ink' : 'text-ink-400'}`}>{label}</span>
    </button>
  );
}

function ProductView({ product }: { product: Product }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [view, setView] = useState<'3d' | number>(product.images.length ? 0 : '3d');
  const creator = useQuery(() => (product.creator_id ? fetchCreatorProfile(product.creator_id) : Promise.resolve(null)), [product.creator_id]);
  const related = useQuery(() => fetchRelated(product), [product.id]);
  const off = discountPct(product.price, product.compare_at_price);
  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= product.low_stock_threshold;
  const specs = Object.entries(product.specs ?? {});
  const photoCount = product.images.length;
  const hasPhotos = photoCount > 0;
  const [preview, setPreview] = useState<number | null>(null);

  return (
    <>
      <Container className="py-8">
        <nav className="mb-5 flex items-center gap-1 text-xs text-ink-400" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-ink">Home</Link><Icon name="chevron_right" size={14} />
          <Link to="/shop" className="hover:text-ink">Shop</Link>
          {product.category && <><Icon name="chevron_right" size={14} /><Link to={`/shop/${product.category.slug}`} className="hover:text-ink">{product.category.name}</Link></>}
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr]">
          {/* Media */}
          <div>
            <div className="relative aspect-square overflow-hidden rounded-4xl bg-gradient-to-br from-white to-paper-200 shadow-soft">
              {view === '3d' ? (
                <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader label="Loading 3D viewer" /></div>}>
                  <ProductViewer3D modelUrl={product.model_url} preset={product.model_preset} accent={product.accent_color} name={product.name} />
                </Suspense>
              ) : (
                <>
                  {hasPhotos ? (
                    <button onClick={() => setPreview(view)} aria-label="Open full-screen preview" className="block h-full w-full cursor-zoom-in">
                      <ProductMedia product={product} index={view} iconSize={140} />
                    </button>
                  ) : (
                    <ProductMedia product={product} index={view} iconSize={140} />
                  )}
                  {hasPhotos && (
                    <button onClick={() => setPreview(view)} aria-label="Open full-screen preview"
                      className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-soft backdrop-blur hover:bg-white">
                      <Icon name="open_in_full" size={20} />
                    </button>
                  )}
                  {photoCount > 1 && (
                    <>
                      <button onClick={() => setView((view + photoCount - 1) % photoCount)} aria-label="Previous photo"
                        className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-soft hover:bg-white">
                        <Icon name="chevron_left" />
                      </button>
                      <button onClick={() => setView((view + 1) % photoCount)} aria-label="Next photo"
                        className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-soft hover:bg-white">
                        <Icon name="chevron_right" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                        {product.images.map((_, i) => (
                          <button key={i} onClick={() => setView(i)} aria-label={`Photo ${i + 1}`} aria-current={view === i}
                            className={`h-2 rounded-full transition-all ${view === i ? 'w-6 bg-ember' : 'w-2 bg-ink/25 hover:bg-ink/40'}`} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <div className="mt-4 flex gap-4">
              <ViewTab icon="view_in_ar" label="3D" active={view === '3d'} onClick={() => setView('3d')} />
              <ViewTab icon="image" label={photoCount > 1 ? `Photos (${photoCount})` : 'Photo'} active={view !== '3d'} onClick={() => setView(0)} />
            </div>
            <ImageLightbox images={product.images} index={preview} alt={product.name} onIndex={setPreview} onClose={() => setPreview(null)} />
          </div>

          {/* Info */}
          <div className="lg:pt-4">
            <div className="flex flex-wrap gap-2">
              {product.is_new && <Badge tone="ember" icon="new_releases">New arrival</Badge>}
              {off > 0 && <Badge tone="red">Save {off}%</Badge>}
              {product.creator_id && <Badge tone="green" icon="design_services">Creator collaboration</Badge>}
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">{product.name}</h1>
            {product.tagline && <p className="mt-2 text-lg text-ink-500">{product.tagline}</p>}
            {product.rating_count > 0 && (
              <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-ink-500">
                <Stars value={Number(product.rating_avg)} />{Number(product.rating_avg).toFixed(1)} · {product.rating_count} review{product.rating_count === 1 ? '' : 's'}
              </a>
            )}

            <div className="mt-6 flex items-end gap-3">
              <span className="font-display text-4xl font-bold">{money(product.price, product.currency)}</span>
              {off > 0 && <span className="pb-1 text-lg text-ink-400 line-through">{money(product.compare_at_price!, product.currency)}</span>}
            </div>
            <p className={`mt-2 flex items-center gap-1.5 text-sm ${soldOut ? 'text-red-600' : lowStock ? 'text-amber-700' : 'text-emerald-700'}`}>
              <Icon name={soldOut ? 'block' : lowStock ? 'warning' : 'check_circle'} size={18} filled />
              {soldOut ? 'Sold out' : lowStock ? `Only ${product.stock} left` : 'In stock — ships in 1–2 business days'}
            </p>

            {product.features.length > 0 && (
              <div className="mt-6 grid grid-cols-2 gap-2">
                {product.features.map((f) => (
                  <div key={f.label} className="flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 text-sm shadow-soft">
                    <Icon name={f.icon} size={20} className="text-ember" />{f.label}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <QuantityStepper value={qty} onChange={setQty} max={Math.max(1, Math.min(20, product.stock))} />
              <Button size="lg" icon="shopping_bag" className="flex-1" disabled={soldOut} onClick={() => add(product.id, qty)}>
                {soldOut ? 'Sold out' : 'Add to bag'}
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs text-ink-500">
              <span className="flex flex-col items-center gap-1 rounded-2xl bg-white/70 p-3"><Icon name="local_shipping" className="text-ink" />Free over ₾150</span>
              <span className="flex flex-col items-center gap-1 rounded-2xl bg-white/70 p-3"><Icon name="autorenew" className="text-ink" />30-day returns</span>
              <span className="flex flex-col items-center gap-1 rounded-2xl bg-white/70 p-3"><Icon name="verified" className="text-ink" />2-year warranty</span>
            </div>

            {creator.data && (
              <Link to={`/creators/${creator.data.slug}`} className="mt-6 flex items-center gap-3 rounded-2xl border border-moss/15 bg-moss-50 p-4 transition hover:border-moss/40">
                {creator.data.avatar_url
                  ? <img src={creator.data.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                  : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-moss font-display font-bold text-white">{creator.data.display_name[0]}</span>}
                <div className="text-sm">
                  <p className="text-xs text-moss">Designed by Sonico Creator</p>
                  <p className="font-semibold">{creator.data.display_name}</p>
                </div>
                <Icon name="arrow_forward" className="ml-auto text-moss" />
              </Link>
            )}
          </div>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <h2 className="font-display text-2xl font-bold">About this product</h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-ink-700">{product.description}</p>
          </section>
          {specs.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-bold">Specifications</h2>
              <dl className="mt-4 divide-y divide-ink/5 rounded-3xl bg-white px-5 shadow-soft">
                {specs.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-3 text-sm">
                    <dt className="text-ink-500">{k}</dt><dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-ink-500">SKU</dt><dd className="font-mono text-xs">{product.sku}</dd></div>
              </dl>
            </section>
          )}
        </div>

        <Reviews product={product} />
      </Container>

      {(related.data?.length ?? 0) > 0 && (
        <Container className="mt-16">
          <SectionHeading eyebrow="You may also like" title="More in this category" />
          <ProductGrid products={related.data!} />
        </Container>
      )}
    </>
  );
}

function Reviews({ product }: { product: Product }) {
  const { user, profile } = useAuth();
  const toast = useToast();
  const reviews = useQuery(() => fetchReviews(product.id), [product.id]);
  const canReview = useQuery(async () => {
    if (!user) return false;
    const { data } = await supabase.rpc('has_purchased', { p_product: product.id });
    return Boolean(data);
  }, [user?.id, product.id]);
  const mine = reviews.data?.find((r) => r.user_id === user?.id);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('product_reviews').insert({
      product_id: product.id,
      user_id: user!.id,
      author_name: profile?.full_name?.split(' ')[0] || 'Sonico listener',
      rating, title: title.trim() || null, body: body.trim(),
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    toast('Thanks — your review is live');
    setBody(''); setTitle('');
    reviews.reload();
  };

  return (
    <section id="reviews" className="mt-16 scroll-mt-24">
      <SectionHeading eyebrow="Verified buyers" title="Reviews" />
      {reviews.loading ? <Loader /> : (reviews.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-ink-500">No reviews yet. Reviews can only be written by customers who bought this product.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.data!.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold">{r.author_name}<Icon name="verified" filled size={16} className="text-moss" /></span>
                <span className="text-xs text-ink-400">{date(r.created_at)}</span>
              </div>
              <Stars value={r.rating} size={15} className="mt-1" />
              {r.title && <p className="mt-3 font-semibold">{r.title}</p>}
              <p className="mt-1 text-sm text-ink-700">{r.body}</p>
            </Card>
          ))}
        </div>
      )}

      {canReview.data && !mine && (
        <Card className="mt-6 p-6">
          <h3 className="font-display text-lg font-bold">Write a review</h3>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} star${i > 1 ? 's' : ''}`} onClick={() => setRating(i)}>
                  <Icon name="star" filled={i <= rating} size={28} className={i <= rating ? 'text-amber-500' : 'text-ink/20'} />
                </button>
              ))}
            </div>
            <Field label="Title (optional)"><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></Field>
            <Field label="Your review" hint="At least 10 characters."><Textarea value={body} onChange={(e) => setBody(e.target.value)} required minLength={10} maxLength={2000} /></Field>
            <FormError message={error} />
            <Button type="submit" loading={busy} icon="rate_review">Publish review</Button>
          </form>
        </Card>
      )}
    </section>
  );
}
