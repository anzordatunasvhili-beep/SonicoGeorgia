import { supabase, unwrap } from './supabase';
import type { Category, CreatorProfile, Product, ProductReview } from './types';

export const PRODUCT_LIST_COLUMNS =
  'id, slug, sku, name, tagline, price, compare_at_price, currency, stock, low_stock_threshold, is_active, is_featured, is_new, images, model_preset, accent_color, rating_avg, rating_count, category_id, creator_id, created_at, category:categories(id, slug, name)';

export type SortKey = 'featured' | 'new' | 'price_asc' | 'price_desc' | 'rating';

export interface ProductFilters {
  q?: string;
  categoryId?: string;
  sort?: SortKey;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  page?: number;
  pageSize?: number;
}

/** Turn free text into a safe prefix tsquery: "noise canc" → "noise:* & canc:*" */
export function toPrefixQuery(q: string) {
  return q
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)
    .slice(0, 6)
    .map((w) => `${w}:*`)
    .join(' & ');
}

export async function fetchCategories(): Promise<Category[]> {
  return unwrap(await supabase.from('categories').select('*').eq('is_active', true).order('sort_order'));
}

export async function fetchProducts(f: ProductFilters = {}): Promise<{ items: Product[]; total: number }> {
  const pageSize = f.pageSize ?? 12;
  const page = f.page ?? 1;
  let query = supabase.from('products').select(PRODUCT_LIST_COLUMNS, { count: 'exact' }).eq('is_active', true);

  const tsq = f.q ? toPrefixQuery(f.q) : '';
  if (tsq) query = query.textSearch('search', tsq, { config: 'simple' });
  if (f.categoryId) query = query.eq('category_id', f.categoryId);
  if (f.minPrice != null) query = query.gte('price', f.minPrice);
  if (f.maxPrice != null) query = query.lte('price', f.maxPrice);
  if (f.inStock) query = query.gt('stock', 0);
  if (f.onSale) query = query.not('compare_at_price', 'is', null);

  switch (f.sort) {
    case 'new': query = query.order('created_at', { ascending: false }); break;
    case 'price_asc': query = query.order('price', { ascending: true }); break;
    case 'price_desc': query = query.order('price', { ascending: false }); break;
    case 'rating': query = query.order('rating_avg', { ascending: false }).order('rating_count', { ascending: false }); break;
    default: query = query.order('is_featured', { ascending: false }).order('is_new', { ascending: false }).order('name');
  }

  const from = (page - 1) * pageSize;
  const res = await query.range(from, from + pageSize - 1);
  if (res.error) throw new Error(res.error.message);
  return { items: (res.data ?? []) as unknown as Product[], total: res.count ?? 0 };
}

export async function fetchFeatured(limit = 8): Promise<Product[]> {
  const res = await supabase.from('products').select(PRODUCT_LIST_COLUMNS)
    .eq('is_active', true).eq('is_featured', true).order('created_at', { ascending: false }).limit(limit);
  return unwrap(res) as unknown as Product[];
}

export async function fetchDeals(limit = 10): Promise<Product[]> {
  const res = await supabase.from('products').select(PRODUCT_LIST_COLUMNS)
    .eq('is_active', true).not('compare_at_price', 'is', null).order('price').limit(limit);
  return unwrap(res) as unknown as Product[];
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const res = await supabase.from('products').select('*, category:categories(id, slug, name)').eq('slug', slug).maybeSingle();
  return unwrap(res) as Product | null;
}

export async function fetchRelated(product: Product, limit = 4): Promise<Product[]> {
  if (!product.category_id) return [];
  const res = await supabase.from('products').select(PRODUCT_LIST_COLUMNS)
    .eq('is_active', true).eq('category_id', product.category_id).neq('id', product.id).limit(limit);
  return unwrap(res) as unknown as Product[];
}

export async function fetchCreatorProfile(id: string): Promise<CreatorProfile | null> {
  return unwrap(await supabase.from('creator_profiles').select('*').eq('id', id).maybeSingle()) as CreatorProfile | null;
}

export async function fetchReviews(productId: string): Promise<ProductReview[]> {
  return unwrap(await supabase.from('product_reviews').select('*').eq('product_id', productId)
    .eq('is_published', true).order('created_at', { ascending: false }).limit(50));
}

export async function fetchLatestReviews(limit = 3): Promise<(ProductReview & { product: { name: string; slug: string } | null })[]> {
  const res = await supabase.from('product_reviews').select('*, product:products(name, slug)')
    .eq('is_published', true).gte('rating', 4).order('created_at', { ascending: false }).limit(limit);
  return unwrap(res) as unknown as (ProductReview & { product: { name: string; slug: string } | null })[];
}
