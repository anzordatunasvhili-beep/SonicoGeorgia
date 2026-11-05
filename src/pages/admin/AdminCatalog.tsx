import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DashboardShell, Table } from '@/components/layout/DashboardShell';
import { Badge, Card, EmptyState, ErrorState, StatTile } from '@/components/ui/Display';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { Checkbox, Field, FormError, Input, Select, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/brand/Loader';
import { useToast } from '@/components/ui/Toast';
import { ProductMedia } from '@/components/product/ProductMedia';
import { useQuery } from '@/lib/useQuery';
import { fileExt, supabase, unwrap, uploadPublic } from '@/lib/supabase';
import { date, money, orderStatusMeta, slugify } from '@/lib/format';
import type { Category, Creator, InventoryMovement, ModelPreset, Order, Product, ProductFeature } from '@/lib/types';

export function AdminLayout() {
  const metrics = useQuery(async () => unwrap(await supabase.rpc('admin_metrics')) as Record<string, number>, []);
  const m = metrics.data ?? {};
  return (
    <DashboardShell
      title="Admin"
      subtitle="Sonico operations"
      accent="ink"
      links={[
        { to: '/admin', label: 'Dashboard', icon: 'monitoring', end: true },
        { to: '/admin/orders', label: 'Orders', icon: 'receipt_long', badge: m.to_fulfil },
        { to: '/admin/products', label: 'Products', icon: 'inventory_2' },
        { to: '/admin/categories', label: 'Categories', icon: 'category' },
        { to: '/admin/inventory', label: 'Inventory', icon: 'warehouse', badge: m.low_stock },
        { to: '/admin/users', label: 'Users', icon: 'group' },
        { to: '/admin/applications', label: 'Applications', icon: 'how_to_reg', badge: m.pending_applications },
        { to: '/admin/creators', label: 'Creators', icon: 'design_services' },
        { to: '/admin/submissions', label: 'Submissions', icon: 'draw', badge: m.pending_submissions },
        { to: '/admin/earnings', label: 'Royalties', icon: 'payments' },
        { to: '/admin/messages', label: 'Messages', icon: 'mail' },
      ]}
    />
  );
}

export function AdminDashboard() {
  const metrics = useQuery(async () => unwrap(await supabase.rpc('admin_metrics')) as Record<string, number>, []);
  const recent = useQuery(async () => unwrap(await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(8)) as Order[], []);
  const low = useQuery(async () => {
    const rows = unwrap(await supabase.from('products').select('id, name, stock, low_stock_threshold, sku').eq('is_active', true).order('stock').limit(20)) as Product[];
    return rows.filter((p) => p.stock <= p.low_stock_threshold);
  }, []);

  if (metrics.error) return <ErrorState message={metrics.error} onRetry={metrics.reload} />;
  const m = metrics.data ?? {};
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon="payments" label="Revenue (30 days)" value={money(m.revenue_30d ?? 0)} hint={`${m.orders_30d ?? 0} paid orders`} />
        <StatTile icon="pending_actions" label="To fulfil" value={m.to_fulfil ?? 0} tone="ink" />
        <StatTile icon="group" label="Customers" value={m.customers ?? 0} tone="moss" />
        <StatTile icon="account_balance" label="Creator liability" value={money(m.creator_liability ?? 0)} hint="Unpaid royalties" tone="ink" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Recent orders</h2><Link to="/admin/orders" className="text-sm font-semibold text-ember">All orders</Link></div>
          <ul className="mt-3 divide-y divide-ink/5 text-sm">
            {recent.data?.map((o) => (
              <li key={o.id}>
                <Link to={`/admin/orders/${o.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                  <span className="font-mono text-xs">{o.order_number}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-500">{o.contact_email}</span>
                  <Badge tone={orderStatusMeta[o.status].tone}>{orderStatusMeta[o.status].label}</Badge>
                  <span className="w-24 text-right font-semibold">{money(o.total, o.currency)}</span>
                </Link>
              </li>
            ))}
            {recent.data?.length === 0 && <li className="py-6 text-center text-ink-500">No orders yet.</li>}
          </ul>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Low stock</h2><Link to="/admin/inventory" className="text-sm font-semibold text-ember">Inventory</Link></div>
          <ul className="mt-3 divide-y divide-ink/5 text-sm">
            {low.data?.map((p) => (
              <li key={p.id} className="flex justify-between py-2.5"><span className="truncate">{p.name}</span><Badge tone={p.stock === 0 ? 'red' : 'amber'}>{p.stock} left</Badge></li>
            ))}
            {low.data?.length === 0 && <li className="py-6 text-center text-ink-500">All products are well stocked.</li>}
          </ul>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link to="/admin/applications" className="rounded-2xl bg-paper-100 p-4 text-sm"><p className="font-display text-2xl font-bold">{m.pending_applications ?? 0}</p>Creator applications</Link>
            <Link to="/admin/submissions" className="rounded-2xl bg-paper-100 p-4 text-sm"><p className="font-display text-2xl font-bold">{m.pending_submissions ?? 0}</p>Designs to review</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Products
export function AdminProducts() {
  const [q, setQ] = useState('');
  const products = useQuery(async () => {
    let query = supabase.from('products').select('*, category:categories(id, slug, name)').order('created_at', { ascending: false });
    if (q.trim()) query = query.or(`name.ilike.%${q.trim().replace(/[%,()]/g, '')}%,sku.ilike.%${q.trim().replace(/[%,()]/g, '')}%`);
    return unwrap(await query) as Product[];
  }, [q]);
  const toast = useToast();

  const toggle = async (p: Product, field: 'is_active' | 'is_featured') => {
    const { error } = await supabase.from('products').update({ [field]: !p[field] }).eq('id', p.id);
    if (error) toast(error.message, 'error');
    else products.setData((list) => list?.map((x) => (x.id === p.id ? { ...x, [field]: !p[field] } : x)) ?? null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full sm:w-72"><Input icon="search" placeholder="Search name or SKU" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <ButtonLink to="/admin/products/new" icon="add">New product</ButtonLink>
      </div>
      {products.error ? <ErrorState message={products.error} onRetry={products.reload} /> : (
        <Table head={['', 'Product', 'Category', 'Price', 'Stock', 'Active', 'Featured', '']}>
          {products.data?.map((p) => (
            <tr key={p.id} className={p.is_active ? '' : 'opacity-60'}>
              <td className="px-4 py-2"><span className="block h-11 w-11 overflow-hidden rounded-xl"><ProductMedia product={p} iconSize={20} /></span></td>
              <td className="px-4 py-2"><p className="font-semibold">{p.name}</p><p className="font-mono text-xs text-ink-400">{p.sku}</p></td>
              <td className="px-4 py-2">{p.category?.name ?? '—'}</td>
              <td className="px-4 py-2">{money(p.price, p.currency)}</td>
              <td className="px-4 py-2"><Badge tone={p.stock === 0 ? 'red' : p.stock <= p.low_stock_threshold ? 'amber' : 'green'}>{p.stock}</Badge></td>
              <td className="px-4 py-2"><Checkbox label={<span className="sr-only">Active</span>} checked={p.is_active} onChange={() => toggle(p, 'is_active')} /></td>
              <td className="px-4 py-2"><Checkbox label={<span className="sr-only">Featured</span>} checked={p.is_featured} onChange={() => toggle(p, 'is_featured')} /></td>
              <td className="px-4 py-2 text-right"><Link to={`/admin/products/${p.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink/5" aria-label={`Edit ${p.name}`}><Icon name="edit" size={20} /></Link></td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

const PRESETS: ModelPreset[] = ['headphones', 'earbuds', 'speaker', 'turntable', 'keyboard', 'radio', 'generic'];

export function AdminProductEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const categories = useQuery(async () => unwrap(await supabase.from('categories').select('*').order('sort_order')) as Category[], []);
  const creators = useQuery(async () => unwrap(await supabase.from('creators').select('*').order('display_name')) as Creator[], []);
  const existing = useQuery(async () => (isNew ? null : unwrap(await supabase.from('products').select('*').eq('id', id).maybeSingle()) as Product | null), [id]);

  const [f, setF] = useState({
    name: '', slug: '', sku: '', tagline: '', description: '', category_id: '', price: '', compare_at_price: '',
    stock: '0', low_stock_threshold: '5', is_active: true, is_featured: false, is_new: false,
    model_preset: 'generic' as ModelPreset, accent_color: '#FF7A1A', creator_id: '', currency: 'GEL',
  });
  const [images, setImages] = useState<string[]>([]);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [features, setFeatures] = useState<ProductFeature[]>([]);
  const [specs, setSpecs] = useState<[string, string][]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = existing.data;
    if (!p) return;
    setF({
      name: p.name, slug: p.slug, sku: p.sku, tagline: p.tagline ?? '', description: p.description ?? '', category_id: p.category_id ?? '',
      price: String(p.price), compare_at_price: p.compare_at_price?.toString() ?? '', stock: String(p.stock), low_stock_threshold: String(p.low_stock_threshold),
      is_active: p.is_active, is_featured: p.is_featured, is_new: p.is_new, model_preset: p.model_preset ?? 'generic', accent_color: p.accent_color,
      creator_id: p.creator_id ?? '', currency: p.currency,
    });
    setImages(p.images);
    setModelUrl(p.model_url);
    setFeatures(p.features ?? []);
    setSpecs(Object.entries(p.specs ?? {}));
  }, [existing.data]);

  if (existing.loading) return <PageLoader />;
  if (!isNew && !existing.data) return <EmptyState icon="search_off" title="Product not found" />;

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const folder = () => `products/${f.slug || slugify(f.name) || 'unsorted'}`;
  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) urls.push(await uploadPublic('product-media', `${folder()}/${Date.now()}-${slugify(file.name)}.${fileExt(file)}`, file));
      setImages((v) => [...v, ...urls]);
    } catch (e) { toast(e instanceof Error ? e.message : 'Upload failed', 'error'); }
    setUploading(false);
  };
  const uploadModel = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try { setModelUrl(await uploadPublic('product-media', `${folder()}/model-${Date.now()}.${fileExt(file)}`, file)); }
    catch (e) { toast(e instanceof Error ? e.message : 'Upload failed', 'error'); }
    setUploading(false);
  };
  const moveImage = (i: number, dir: -1 | 1) => setImages((v) => {
    const n = [...v]; const j = i + dir; if (j < 0 || j >= n.length) return v; [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      name: f.name.trim(), slug: f.slug.trim() || slugify(f.name), sku: f.sku.trim(), tagline: f.tagline.trim() || null,
      description: f.description.trim() || null, category_id: f.category_id || null, price: Number(f.price),
      compare_at_price: f.compare_at_price ? Number(f.compare_at_price) : null, currency: f.currency,
      low_stock_threshold: Number(f.low_stock_threshold) || 0, is_active: f.is_active, is_featured: f.is_featured, is_new: f.is_new,
      model_preset: f.model_preset, accent_color: f.accent_color, creator_id: f.creator_id || null,
      images, model_url: modelUrl, features: features.filter((x) => x.label.trim()),
      specs: Object.fromEntries(specs.filter(([k]) => k.trim())),
      ...(isNew ? { stock: Number(f.stock) || 0 } : {}),
    };
    const res = isNew
      ? await supabase.from('products').insert(payload).select('id').single()
      : await supabase.from('products').update(payload).eq('id', id).select('id').single();
    setBusy(false);
    if (res.error) { setError(res.error.message); return; }
    toast('Product saved');
    if (isNew) navigate(`/admin/products/${res.data.id}`, { replace: true });
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin/products" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink"><Icon name="arrow_back" size={18} />Products</Link>
        <div className="flex gap-2">
          {!isNew && existing.data?.is_active && <ButtonLink to={`/product/${existing.data.slug}`} variant="outline" size="sm" icon="open_in_new">View</ButtonLink>}
          <Button type="submit" loading={busy} icon="save">Save</Button>
        </div>
      </div>
      <FormError message={error} />

      <Card className="grid gap-5 p-6 sm:grid-cols-2">
        <Field label="Name"><Input required value={f.name} onChange={set('name')} onBlur={() => !f.slug && setF((s) => ({ ...s, slug: slugify(s.name) }))} /></Field>
        <Field label="URL slug" hint="Lowercase letters, numbers and dashes."><Input required pattern="[a-z0-9-]+" value={f.slug} onChange={set('slug')} /></Field>
        <Field label="SKU"><Input required value={f.sku} onChange={set('sku')} /></Field>
        <Field label="Category">
          <Select value={f.category_id} onChange={set('category_id')}>
            <option value="">None</option>
            {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Tagline" className="sm:col-span-2"><Input value={f.tagline} onChange={set('tagline')} /></Field>
        <Field label="Description" className="sm:col-span-2"><Textarea rows={6} value={f.description} onChange={set('description')} /></Field>
      </Card>

      <Card className="grid gap-5 p-6 sm:grid-cols-4">
        <Field label="Price"><Input required type="number" min={0} step="0.01" value={f.price} onChange={set('price')} /></Field>
        <Field label="Compare-at price" hint="Shows a discount."><Input type="number" min={0} step="0.01" value={f.compare_at_price} onChange={set('compare_at_price')} /></Field>
        <Field label="Currency"><Select value={f.currency} onChange={set('currency')}><option>GEL</option><option>USD</option><option>EUR</option></Select></Field>
        {isNew
          ? <Field label="Initial stock"><Input type="number" min={0} value={f.stock} onChange={set('stock')} /></Field>
          : <Field label="Stock" hint="Change in Inventory (audited)."><Input value={existing.data?.stock ?? 0} disabled /></Field>}
        <Field label="Low-stock alert at"><Input type="number" min={0} value={f.low_stock_threshold} onChange={set('low_stock_threshold')} /></Field>
        <div className="flex flex-col justify-end gap-2 sm:col-span-3">
          <div className="flex flex-wrap gap-5">
            <Checkbox label="Active (visible)" checked={f.is_active} onChange={set('is_active')} />
            <Checkbox label="Featured" checked={f.is_featured} onChange={set('is_featured')} />
            <Checkbox label="New arrival" checked={f.is_new} onChange={set('is_new')} />
          </div>
        </div>
      </Card>

      <Card className="space-y-5 p-6">
        <h3 className="font-display font-bold">Media</h3>
        <div className="flex flex-wrap gap-3">
          {images.map((url, i) => (
            <div key={url} className="group relative h-28 w-28 overflow-hidden rounded-2xl bg-paper-100">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition group-hover:opacity-100">
                <button type="button" onClick={() => moveImage(i, -1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white" aria-label="Move left"><Icon name="chevron_left" size={18} /></button>
                <button type="button" onClick={() => setImages((v) => v.filter((x) => x !== url))} className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-600" aria-label="Remove"><Icon name="delete" size={16} /></button>
                <button type="button" onClick={() => moveImage(i, 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white" aria-label="Move right"><Icon name="chevron_right" size={18} /></button>
              </div>
              {i === 0 && <span className="absolute left-1 top-1 rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-white">COVER</span>}
            </div>
          ))}
          <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink/15 text-xs text-ink-500 hover:border-ember hover:text-ember">
            <Icon name={uploading ? 'progress_activity' : 'add_photo_alternate'} className={uploading ? 'animate-spin' : ''} />Upload
            <input type="file" multiple accept="image/*" className="sr-only" onChange={(e) => uploadImages(e.target.files)} />
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="3D model (.glb)" hint="Loaded only on the product page.">
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-semibold hover:border-ink/30">
                <Icon name="upload" size={18} />{modelUrl ? 'Replace' : 'Upload'}
                <input type="file" accept=".glb,.gltf" className="sr-only" onChange={(e) => uploadModel(e.target.files?.[0])} />
              </label>
              {modelUrl && <IconButton type="button" icon="delete" label="Remove model" onClick={() => setModelUrl(null)} />}
            </div>
          </Field>
          <Field label="Fallback 3D preset" hint="Used when no model is uploaded.">
            <Select value={f.model_preset} onChange={set('model_preset')}>{PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}</Select>
          </Field>
          <Field label="Accent colour"><Input type="color" value={f.accent_color} onChange={set('accent_color')} className="h-11 p-1" /></Field>
        </div>
      </Card>

      <Card className="grid gap-6 p-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 font-display font-bold">Feature highlights</h3>
          <p className="mb-3 text-xs text-ink-500">Icon = Material Symbols name, e.g. <code>graphic_eq</code>.</p>
          <div className="space-y-2">
            {features.map((ft, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-100"><Icon name={ft.icon || 'star'} size={20} /></span>
                <Input placeholder="icon" value={ft.icon} className="w-32" onChange={(e) => setFeatures((v) => v.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)))} />
                <Input placeholder="Label" value={ft.label} onChange={(e) => setFeatures((v) => v.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <IconButton type="button" icon="close" label="Remove" onClick={() => setFeatures((v) => v.filter((_, j) => j !== i))} />
              </div>
            ))}
          </div>
          <Button type="button" variant="ghost" size="sm" icon="add" className="mt-2" onClick={() => setFeatures((v) => [...v, { icon: 'graphic_eq', label: '' }])}>Add feature</Button>
        </div>
        <div>
          <h3 className="mb-3 font-display font-bold">Specifications</h3>
          <div className="space-y-2">
            {specs.map(([k, v], i) => (
              <div key={i} className="flex items-center gap-2">
                <Input placeholder="Name" value={k} className="w-40" onChange={(e) => setSpecs((s) => s.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
                <Input placeholder="Value" value={v} onChange={(e) => setSpecs((s) => s.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
                <IconButton type="button" icon="close" label="Remove" onClick={() => setSpecs((s) => s.filter((_, j) => j !== i))} />
              </div>
            ))}
          </div>
          <Button type="button" variant="ghost" size="sm" icon="add" className="mt-2" onClick={() => setSpecs((s) => [...s, ['', '']])}>Add spec</Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-display font-bold">Creator attribution</h3>
        <p className="mt-1 text-xs text-ink-500">Royalties accrue only while the creator has an <b>active</b> commission agreement for this product.</p>
        <div className="mt-4 max-w-sm">
          <Select value={f.creator_id} onChange={set('creator_id')}>
            <option value="">Sonico in-house design</option>
            {creators.data?.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
          </Select>
        </div>
      </Card>
    </form>
  );
}

// ---------------------------------------------------------------- Categories
export function AdminCategories() {
  const toast = useToast();
  const cats = useQuery(async () => unwrap(await supabase.from('categories').select('*').order('sort_order')) as Category[], []);
  const [edit, setEdit] = useState<Partial<Category> | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    const payload = { name: edit.name, slug: edit.slug || slugify(edit.name ?? ''), description: edit.description || null, icon: edit.icon || 'category', accent: edit.accent || '#FF7A1A', sort_order: Number(edit.sort_order) || 0, is_active: edit.is_active ?? true };
    const res = edit.id ? await supabase.from('categories').update(payload).eq('id', edit.id) : await supabase.from('categories').insert(payload);
    setBusy(false);
    if (res.error) { toast(res.error.message, 'error'); return; }
    setEdit(null);
    cats.reload();
  };

  const remove = async (c: Category) => {
    if (!confirm(`Delete category “${c.name}”? Products in it become uncategorised.`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', c.id);
    if (error) toast(error.message, 'error'); else cats.reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button icon="add" onClick={() => setEdit({ is_active: true, icon: 'category', accent: '#FF7A1A', sort_order: ((cats.data?.length ?? 0) + 1) * 10 })}>New category</Button></div>
      <Table head={['', 'Name', 'Slug', 'Order', 'Active', '']}>
        {cats.data?.map((c) => (
          <tr key={c.id}>
            <td className="px-4 py-2"><span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${c.accent}22`, color: c.accent }}><Icon name={c.icon} /></span></td>
            <td className="px-4 py-2 font-semibold">{c.name}</td>
            <td className="px-4 py-2 font-mono text-xs">{c.slug}</td>
            <td className="px-4 py-2">{c.sort_order}</td>
            <td className="px-4 py-2">{c.is_active ? <Badge tone="green">Active</Badge> : <Badge>Hidden</Badge>}</td>
            <td className="px-4 py-2 text-right">
              <IconButton icon="edit" label="Edit" onClick={() => setEdit(c)} />
              <IconButton icon="delete" label="Delete" onClick={() => remove(c)} />
            </td>
          </tr>
        ))}
      </Table>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit category' : 'New category'}>
        {edit && (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input required value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Slug"><Input pattern="[a-z0-9-]*" value={edit.slug ?? ''} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} placeholder={slugify(edit.name ?? '')} /></Field>
            <Field label="Icon (Material Symbols)"><Input value={edit.icon ?? ''} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} /></Field>
            <Field label="Accent"><Input type="color" className="h-11 p-1" value={edit.accent ?? '#FF7A1A'} onChange={(e) => setEdit({ ...edit, accent: e.target.value })} /></Field>
            <Field label="Sort order"><Input type="number" value={edit.sort_order ?? 0} onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })} /></Field>
            <div className="flex items-end pb-2"><Checkbox label="Active" checked={edit.is_active ?? true} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} /></div>
            <Field label="Description" className="sm:col-span-2"><Textarea rows={2} value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Button type="submit" loading={busy} icon="save">Save</Button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------- Inventory
export function AdminInventory() {
  const toast = useToast();
  const products = useQuery(async () => unwrap(await supabase.from('products').select('id, name, sku, stock, low_stock_threshold, is_active, images, accent_color, model_preset').order('stock')) as Product[], []);
  const moves = useQuery(async () => unwrap(await supabase.from('inventory_movements').select('*').order('created_at', { ascending: false }).limit(40)) as InventoryMovement[], []);
  const [target, setTarget] = useState<Product | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('restock');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const names = new Map(products.data?.map((p) => [p.id, p.name]));

  const adjust = async (e: FormEvent) => {
    e.preventDefault();
    if (!target || !Number(delta)) return;
    setBusy(true);
    const { error } = await supabase.rpc('admin_adjust_stock', { p_product: target.id, p_delta: Number(delta), p_reason: reason, p_note: note || null });
    setBusy(false);
    if (error) { toast(error.message, 'error'); return; }
    toast('Stock updated');
    setTarget(null); setDelta(''); setNote('');
    products.reload(); moves.reload();
  };

  return (
    <div className="space-y-6">
      <Table head={['Product', 'SKU', 'Stock', 'Alert at', '']}>
        {products.data?.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-2 font-semibold">{p.name}{!p.is_active && <span className="ml-2 text-xs text-ink-400">(hidden)</span>}</td>
            <td className="px-4 py-2 font-mono text-xs">{p.sku}</td>
            <td className="px-4 py-2"><Badge tone={p.stock === 0 ? 'red' : p.stock <= p.low_stock_threshold ? 'amber' : 'green'}>{p.stock}</Badge></td>
            <td className="px-4 py-2">{p.low_stock_threshold}</td>
            <td className="px-4 py-2 text-right"><Button size="sm" variant="outline" icon="tune" onClick={() => setTarget(p)}>Adjust</Button></td>
          </tr>
        ))}
      </Table>
      <div>
        <h2 className="mb-3 font-display text-lg font-bold">Recent movements</h2>
        <Table head={['When', 'Product', 'Change', 'Reason', 'Note']}>
          {moves.data?.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-2">{date(m.created_at, true)}</td>
              <td className="px-4 py-2">{names.get(m.product_id) ?? '—'}</td>
              <td className={`px-4 py-2 font-semibold ${m.delta > 0 ? 'text-emerald-700' : 'text-red-600'}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
              <td className="px-4 py-2">{m.reason}</td>
              <td className="px-4 py-2 text-ink-500">{m.note ?? (m.order_id ? <Link className="text-ember" to={`/admin/orders/${m.order_id}`}>order</Link> : '—')}</td>
            </tr>
          ))}
        </Table>
      </div>
      <Modal open={!!target} onClose={() => setTarget(null)} title={`Adjust stock — ${target?.name ?? ''}`}>
        <form onSubmit={adjust} className="space-y-4">
          <p className="text-sm text-ink-500">Current stock: <b className="text-ink">{target?.stock}</b></p>
          <Field label="Change (+/-)"><Input required type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="e.g. 25 or -3" /></Field>
          <Field label="Reason"><Select value={reason} onChange={(e) => setReason(e.target.value)}><option value="restock">Restock</option><option value="adjustment">Adjustment / count</option><option value="return">Customer return</option></Select></Field>
          <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <Button type="submit" loading={busy} icon="check">Apply</Button>
        </form>
      </Modal>
    </div>
  );
}
