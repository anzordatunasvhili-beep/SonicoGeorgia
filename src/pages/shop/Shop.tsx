import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Container } from '@/components/layout/Layout';
import { ProductGrid } from '@/components/product/ProductCard';
import { EmptyState, ErrorState } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Select } from '@/components/ui/Form';
import { useQuery } from '@/lib/useQuery';
import { fetchCategories, fetchProducts, type SortKey } from '@/lib/catalog';

const PAGE_SIZE = 12;
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'new', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

export default function Shop() {
  const { category: categorySlug } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = params.get('q') ?? '';
  const sort = (params.get('sort') as SortKey) || 'featured';
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const min = params.get('min') ? Number(params.get('min')) : undefined;
  const max = params.get('max') ? Number(params.get('max')) : undefined;
  const inStock = params.get('stock') === '1';
  const onSale = params.get('sale') === '1';

  const categories = useQuery(fetchCategories, []);
  const category = useMemo(() => categories.data?.find((c) => c.slug === categorySlug), [categories.data, categorySlug]);
  const categoryReady = !categorySlug || !!categories.data;

  const products = useQuery(
    () => (categoryReady
      ? fetchProducts({ q, categoryId: category?.id, sort, page, pageSize: PAGE_SIZE, minPrice: min, maxPrice: max, inStock, onSale })
      : Promise.resolve({ items: [], total: 0 })),
    [q, category?.id, categoryReady, sort, page, min, max, inStock, onSale],
  );

  const [qDraft, setQDraft] = useState(q);
  const [minDraft, setMinDraft] = useState(min?.toString() ?? '');
  const [maxDraft, setMaxDraft] = useState(max?.toString() ?? '');
  useEffect(() => {
    setQDraft(q);
  }, [q]);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null || v === '' ? next.delete(k) : next.set(k, v)));
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };

  const total = products.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const notFound = categorySlug && categories.data && !category;

  const filters = (
    <div className="space-y-7">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Category</h3>
        <ul className="space-y-1">
          <li>
            <Link to={`/shop?${new URLSearchParams([...params].filter(([k]) => k !== 'page')).toString()}`}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${!categorySlug ? 'bg-ink text-white' : 'hover:bg-ink/5'}`}>
              <Icon name="apps" size={18} />All products
            </Link>
          </li>
          {(categories.data ?? []).map((c) => (
            <li key={c.id}>
              <Link to={`/shop/${c.slug}?${new URLSearchParams([...params].filter(([k]) => k !== 'page')).toString()}`}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${c.slug === categorySlug ? 'bg-ink text-white' : 'hover:bg-ink/5'}`}>
                <Icon name={c.icon} size={18} />{c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold">Price (₾)</h3>
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); set({ min: minDraft, max: maxDraft }); }}>
          <Input inputMode="numeric" placeholder="Min" value={minDraft} onChange={(e) => setMinDraft(e.target.value.replace(/\D/g, ''))} aria-label="Minimum price" />
          <span className="text-ink-400">–</span>
          <Input inputMode="numeric" placeholder="Max" value={maxDraft} onChange={(e) => setMaxDraft(e.target.value.replace(/\D/g, ''))} aria-label="Maximum price" />
          <Button type="submit" variant="dark" size="sm" aria-label="Apply price"><Icon name="check" size={18} /></Button>
        </form>
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Availability</h3>
        <Checkbox label="In stock only" checked={inStock} onChange={(e) => set({ stock: e.target.checked ? '1' : null })} />
        <Checkbox label="On sale" checked={onSale} onChange={(e) => set({ sale: e.target.checked ? '1' : null })} />
      </div>
      {(min != null || max != null || inStock || onSale || q) && (
        <Button variant="outline" size="sm" icon="filter_alt_off" onClick={() => { setMinDraft(''); setMaxDraft(''); navigate(categorySlug ? `/shop/${categorySlug}` : '/shop'); }}>
          Clear filters
        </Button>
      )}
    </div>
  );

  if (notFound) {
    return <Container className="py-20"><EmptyState icon="category" title="Category not found" action={<Link className="font-semibold text-ember" to="/shop">Browse all products</Link>} /></Container>;
  }

  return (
    <Container className="py-10">
      <nav className="mb-4 flex items-center gap-1 text-xs text-ink-400" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-ink">Home</Link><Icon name="chevron_right" size={14} />
        <Link to="/shop" className="hover:text-ink">Shop</Link>
        {category && <><Icon name="chevron_right" size={14} /><span className="text-ink">{category.name}</span></>}
      </nav>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold">{q ? `“${q}”` : category?.name ?? 'All products'}</h1>
          <p className="mt-1 text-sm text-ink-500">{category?.description ?? 'Sound gear, instruments and listening objects.'}</p>
        </div>
        <form className="w-full sm:w-80" role="search" onSubmit={(e) => { e.preventDefault(); set({ q: qDraft.trim() }); }}>
          <Input icon="search" value={qDraft} onChange={(e) => setQDraft(e.target.value)} placeholder="Search products" aria-label="Search products" />
        </form>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">{filters}</aside>

        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" icon="tune" className="lg:hidden" onClick={() => setFiltersOpen((v) => !v)}>Filters</Button>
            <p className="text-sm text-ink-500">{products.loading ? 'Loading…' : `${total} product${total === 1 ? '' : 's'}`}</p>
            <div className="w-48">
              <Select value={sort} onChange={(e) => set({ sort: e.target.value === 'featured' ? null : e.target.value })} aria-label="Sort products">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>
          </div>
          {filtersOpen && <div className="mb-6 rounded-3xl bg-white p-5 shadow-soft lg:hidden">{filters}</div>}

          {products.error ? (
            <ErrorState message={products.error} onRetry={products.reload} />
          ) : !products.loading && total === 0 ? (
            <EmptyState icon="search_off" title="No products match" text="Try a different search or clear your filters." />
          ) : (
            <ProductGrid products={products.data?.items ?? []} loading={products.loading} cols={3} />
          )}

          {pages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
              <Button variant="outline" size="sm" icon="chevron_left" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>Prev</Button>
              <span className="px-3 text-sm text-ink-500">Page {page} of {pages}</span>
              <Button variant="outline" size="sm" iconRight="chevron_right" disabled={page >= pages} onClick={() => set({ page: String(page + 1) })}>Next</Button>
            </nav>
          )}
        </div>
      </div>
    </Container>
  );
}
