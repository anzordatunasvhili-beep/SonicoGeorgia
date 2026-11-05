import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DashboardShell, Table } from '@/components/layout/DashboardShell';
import { Badge, Card, EmptyState, ErrorState, StatTile } from '@/components/ui/Display';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Field, FormError, Input, Select, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/brand/Loader';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@/lib/useQuery';
import { fetchCategories } from '@/lib/catalog';
import { fileExt, signedUrl, supabase, unwrap, uploadPublic } from '@/lib/supabase';
import {
  agreementStatusMeta, date, earningStatusMeta, money, orderStatusMeta, productionStatusMeta, slugify, submissionStatusMeta,
} from '@/lib/format';
import type { CommissionAgreement, CreatorEarning, CreatorPayout, CreatorSale, DesignSubmission } from '@/lib/types';

const MAX_IMAGES = 8;
const MAX_FILE_MB = 50;

export function CreatorLayout() {
  const { creator } = useAuth();
  const pendingAgreements = useQuery(async () => {
    const { count } = await supabase.from('commission_agreements').select('id', { count: 'exact', head: true }).eq('status', 'proposed');
    return count ?? 0;
  }, [creator?.id]);
  return (
    <DashboardShell
      title="Creator studio"
      subtitle={creator ? `Signed in as ${creator.display_name}` : undefined}
      accent="moss"
      links={[
        { to: '/creator', label: 'Overview', icon: 'space_dashboard', end: true },
        { to: '/creator/submissions', label: 'Designs', icon: 'draw' },
        { to: '/creator/agreements', label: 'Agreements', icon: 'handshake', badge: pendingAgreements.data ?? 0 },
        { to: '/creator/earnings', label: 'Earnings', icon: 'payments' },
        { to: '/creator/profile', label: 'Profile', icon: 'badge' },
      ]}
      header={<ButtonLink to="/creator/submissions/new" variant="moss" icon="add">New design</ButtonLink>}
    />
  );
}

const fetchSubmissions = async () =>
  unwrap(await supabase.from('design_submissions').select('*').order('updated_at', { ascending: false })) as DesignSubmission[];
const fetchEarnings = async () =>
  unwrap(await supabase.from('creator_earnings').select('*').order('created_at', { ascending: false })) as CreatorEarning[];

export function CreatorOverview() {
  const subs = useQuery(fetchSubmissions, []);
  const earnings = useQuery(fetchEarnings, []);
  const sales = useQuery(async () => unwrap(await supabase.from('creator_sales').select('*').order('paid_at', { ascending: false }).limit(8)) as CreatorSale[], []);

  const e = earnings.data ?? [];
  const sum = (s: string[]) => e.filter((x) => s.includes(x.status)).reduce((t, x) => t + Number(x.amount), 0);
  const live = (subs.data ?? []).filter((s) => s.production_status === 'released').length;
  const inProd = (subs.data ?? []).filter((s) => ['prototyping', 'tooling', 'manufacturing'].includes(s.production_status)).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon="draw" label="Designs submitted" value={(subs.data ?? []).filter((s) => s.status !== 'draft').length} tone="moss" />
        <StatTile icon="precision_manufacturing" label="In production" value={inProd} hint={`${live} released`} tone="ink" />
        <StatTile icon="hourglass_top" label="Pending earnings" value={money(sum(['pending', 'payable']))} hint="Payable after the return window" />
        <StatTile icon="account_balance" label="Paid out" value={money(sum(['paid']))} tone="moss" />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Recent sales of your products</h2>
          <Link to="/creator/earnings" className="text-sm font-semibold text-moss">All earnings</Link>
        </div>
        {sales.data?.length ? (
          <ul className="mt-4 divide-y divide-ink/5 text-sm">
            {sales.data.map((s) => (
              <li key={s.order_item_id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0 truncate"><b>{s.product_name}</b> × {s.quantity} <span className="text-ink-400">· {s.order_number} · {date(s.paid_at)}</span></span>
                <Badge tone={orderStatusMeta[s.order_status].tone}>{orderStatusMeta[s.order_status].label}</Badge>
              </li>
            ))}
          </ul>
        ) : <p className="mt-4 text-sm text-ink-500">Sales appear here as soon as customers buy your released products.</p>}
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Latest designs</h2>
          <Link to="/creator/submissions" className="text-sm font-semibold text-moss">All designs</Link>
        </div>
        {subs.data?.length ? <SubmissionList items={subs.data.slice(0, 4)} /> : (
          <div className="mt-4"><EmptyState icon="draw" title="Submit your first design" action={<ButtonLink to="/creator/submissions/new" variant="moss" icon="add">New design</ButtonLink>} /></div>
        )}
      </Card>
    </div>
  );
}

function SubmissionList({ items }: { items: DesignSubmission[] }) {
  return (
    <ul className="mt-4 divide-y divide-ink/5">
      {items.map((s) => (
        <li key={s.id}>
          <Link to={`/creator/submissions/${s.id}`} className="flex flex-wrap items-center gap-3 py-3 hover:opacity-80">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-moss-50 text-moss"><Icon name="draw" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{s.title}</p>
              <p className="text-xs text-ink-500">Updated {date(s.updated_at)}</p>
            </div>
            <Badge tone={submissionStatusMeta[s.status].tone}>{submissionStatusMeta[s.status].label}</Badge>
            {s.status === 'approved' && <Badge tone={productionStatusMeta[s.production_status].tone} icon="precision_manufacturing">{productionStatusMeta[s.production_status].label}</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CreatorSubmissions() {
  const subs = useQuery(fetchSubmissions, []);
  if (subs.loading) return <PageLoader />;
  if (subs.error) return <ErrorState message={subs.error} onRetry={subs.reload} />;
  if (!subs.data?.length) return <EmptyState icon="draw" title="No designs yet" text="Drafts are private until you submit them for review." action={<ButtonLink to="/creator/submissions/new" variant="moss" icon="add">New design</ButtonLink>} />;
  return <Card className="px-6 py-2"><SubmissionList items={subs.data} /></Card>;
}

/** Create or edit a design (drafts and "changes requested" only). */
export function SubmissionEditor() {
  const { id } = useParams();
  const { user, creator } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const categories = useQuery(fetchCategories, []);
  const existing = useQuery(async () => (id ? unwrap(await supabase.from('design_submissions').select('*').eq('id', id).maybeSingle()) as DesignSubmission | null : null), [id]);

  const [form, setForm] = useState({ title: '', category_id: '', summary: '', description: '', materials: '', target_price: '' });
  const [images, setImages] = useState<string[]>([]);
  const [model, setModel] = useState<string | null>(null);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newModel, setNewModel] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'draft' | 'submit' | null>(null);

  useEffect(() => {
    const s = existing.data;
    if (!s) return;
    setForm({ title: s.title, category_id: s.category_id ?? '', summary: s.summary ?? '', description: s.description, materials: s.materials ?? '', target_price: s.target_price?.toString() ?? '' });
    setImages(s.image_paths);
    setModel(s.model_path);
  }, [existing.data]);

  if (existing.loading) return <PageLoader />;
  if (id && !existing.data) return <EmptyState icon="search_off" title="Design not found" />;
  if (existing.data && !['draft', 'changes_requested'].includes(existing.data.status)) {
    return <EmptyState icon="lock" title="This design is under review" text="It can’t be edited right now." action={<ButtonLink to={`/creator/submissions/${id}`} variant="outline">View status</ButtonLink>} />;
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pickImages = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).filter((f) => f.type.startsWith('image/') && f.size <= MAX_FILE_MB * 1024 * 1024);
    setNewImages((prev) => [...prev, ...list].slice(0, MAX_IMAGES - images.length));
  };

  const save = async (submit: boolean) => {
    if (!form.title.trim() || form.description.trim().length < 50) {
      setError('Add a title and a description of at least 50 characters.');
      return;
    }
    if (submit && images.length + newImages.length === 0) {
      setError('Add at least one image (sketch, render or photo) before submitting.');
      return;
    }
    setBusy(submit ? 'submit' : 'draft');
    setError(null);
    try {
      const fields = {
        title: form.title.trim(),
        category_id: form.category_id || null,
        summary: form.summary.trim() || null,
        description: form.description.trim(),
        materials: form.materials.trim() || null,
        target_price: form.target_price ? Number(form.target_price) : null,
      };
      // 1. Ensure a row exists (so files can live under its id).
      let subId = id;
      if (!subId) {
        const row = unwrap(await supabase.from('design_submissions').insert({ ...fields, creator_id: creator!.id, status: 'draft' }).select('id').single()) as { id: string };
        subId = row.id;
      }
      // 2. Upload new files to the private bucket: <uid>/<submission>/<file>
      const base = `${user!.id}/${subId}`;
      const uploaded: string[] = [];
      for (const f of newImages) {
        const path = `${base}/${Date.now()}-${slugify(f.name.replace(/\.[^.]+$/, '')) || 'image'}.${fileExt(f)}`;
        const { error: upErr } = await supabase.storage.from('creator-submissions').upload(path, f);
        if (upErr) throw new Error(upErr.message);
        uploaded.push(path);
      }
      let modelPath = model;
      if (newModel) {
        modelPath = `${base}/model-${Date.now()}.${fileExt(newModel)}`;
        const { error: upErr } = await supabase.storage.from('creator-submissions').upload(modelPath, newModel);
        if (upErr) throw new Error(upErr.message);
      }
      // 3. Save fields + files (+ status)
      unwrap(await supabase.from('design_submissions').update({
        ...fields,
        image_paths: [...images, ...uploaded],
        model_path: modelPath,
        status: submit ? 'submitted' : 'draft',
      }).eq('id', subId).select('id').single());

      toast(submit ? 'Design submitted for review' : 'Draft saved');
      navigate(`/creator/submissions/${subId}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void save(true); };

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="font-display text-2xl font-bold">{id ? 'Edit design' : 'New design'}</h2>
      {existing.data?.status === 'changes_requested' && existing.data.admin_notes && (
        <div className="mt-4 rounded-2xl bg-ember-50 p-4 text-sm text-ember-700"><b>Requested changes:</b> {existing.data.admin_notes}</div>
      )}
      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Product name"><Input required maxLength={80} value={form.title} onChange={set('title')} /></Field>
          <Field label="Category">
            <Select value={form.category_id} onChange={set('category_id')}>
              <option value="">Choose…</option>
              {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="One-line pitch"><Input maxLength={140} value={form.summary} onChange={set('summary')} placeholder="A turntable that…" /></Field>
        <Field label="Description" hint="What is it, who is it for, how does it work, what makes it special? Min. 50 characters.">
          <Textarea rows={7} required value={form.description} onChange={set('description')} maxLength={8000} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Materials & components"><Input value={form.materials} onChange={set('materials')} placeholder="Anodised aluminium, walnut…" /></Field>
          <Field label="Suggested retail price (₾)"><Input type="number" min={0} step="1" value={form.target_price} onChange={set('target_price')} /></Field>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Images <span className="text-ink-400">({images.length + newImages.length}/{MAX_IMAGES})</span></p>
          <div className="flex flex-wrap gap-3">
            {images.map((p) => <PrivateThumb key={p} path={p} onRemove={() => setImages((v) => v.filter((x) => x !== p))} />)}
            {newImages.map((f, i) => (
              <div key={i} className="relative h-24 w-24 overflow-hidden rounded-2xl bg-paper-100">
                <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setNewImages((v) => v.filter((_, j) => j !== i))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90" aria-label="Remove image"><Icon name="close" size={16} /></button>
              </div>
            ))}
            {images.length + newImages.length < MAX_IMAGES && (
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink/15 text-xs text-ink-500 hover:border-moss hover:text-moss">
                <Icon name="add_photo_alternate" />Add
                <input type="file" multiple accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pickImages(e.target.files)} />
              </label>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">3D model <span className="text-ink-400">(optional, .glb / .gltf, max {MAX_FILE_MB} MB)</span></p>
          <div className="flex flex-wrap items-center gap-3">
            {(newModel || model) && (
              <span className="inline-flex items-center gap-2 rounded-full bg-paper-100 px-3 py-1.5 text-sm">
                <Icon name="view_in_ar" size={18} />{newModel?.name ?? model!.split('/').pop()}
                <button type="button" aria-label="Remove model" onClick={() => { setNewModel(null); setModel(null); }}><Icon name="close" size={16} /></button>
              </span>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-semibold hover:border-ink/30">
              <Icon name="upload" size={18} />{model || newModel ? 'Replace' : 'Upload model'}
              <input type="file" accept=".glb,.gltf,model/gltf-binary" className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size <= MAX_FILE_MB * 1024 * 1024) setNewModel(f); else if (f) setError(`Model must be under ${MAX_FILE_MB} MB`); }} />
            </label>
          </div>
        </div>

        <FormError message={error} />
        <div className="flex flex-wrap gap-3 border-t border-ink/5 pt-5">
          <Button type="submit" variant="moss" loading={busy === 'submit'} disabled={!!busy} iconRight="send">Submit for review</Button>
          <Button type="button" variant="outline" loading={busy === 'draft'} disabled={!!busy} onClick={() => save(false)} icon="save">Save draft</Button>
        </div>
        <p className="text-xs text-ink-400">By submitting you confirm this design is your original work. You keep all rights unless a commission agreement is accepted.</p>
      </form>
    </Card>
  );
}

function PrivateThumb({ path, onRemove }: { path: string; onRemove?: () => void }) {
  const url = useQuery(() => signedUrl(path), [path]);
  return (
    <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-paper-100">
      {url.data && <a href={url.data} target="_blank" rel="noreferrer"><img src={url.data} alt="" className="h-full w-full object-cover" /></a>}
      {onRemove && (
        <button type="button" onClick={onRemove} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90" aria-label="Remove image"><Icon name="close" size={16} /></button>
      )}
    </div>
  );
}

const PRODUCTION_STEPS = ['prototyping', 'tooling', 'manufacturing', 'released'] as const;

export function SubmissionDetail() {
  const { id = '' } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const sub = useQuery(async () => unwrap(await supabase.from('design_submissions').select('*').eq('id', id).maybeSingle()) as DesignSubmission | null, [id]);
  const agreements = useQuery(async () => unwrap(await supabase.from('commission_agreements').select('*').eq('submission_id', id).order('created_at', { ascending: false })) as CommissionAgreement[], [id]);

  if (sub.loading) return <PageLoader />;
  const s = sub.data;
  if (!s) return <EmptyState icon="search_off" title="Design not found" />;
  const st = submissionStatusMeta[s.status];
  const prodIdx = PRODUCTION_STEPS.indexOf(s.production_status as (typeof PRODUCTION_STEPS)[number]);

  const remove = async () => {
    if (!confirm('Delete this draft permanently?')) return;
    const { error } = await supabase.from('design_submissions').delete().eq('id', s.id);
    if (error) toast(error.message, 'error');
    else {
      if (s.image_paths.length || s.model_path) {
        await supabase.storage.from('creator-submissions').remove([...s.image_paths, ...(s.model_path ? [s.model_path] : [])]);
      }
      navigate('/creator/submissions');
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/creator/submissions" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink"><Icon name="arrow_back" size={18} />All designs</Link>
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">{s.title}</h2>
            {s.summary && <p className="text-ink-500">{s.summary}</p>}
            <p className="mt-1 text-xs text-ink-400">{s.submitted_at ? `Submitted ${date(s.submitted_at)}` : 'Not submitted yet'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={st.tone}>{st.label}</Badge>
            {['draft', 'changes_requested'].includes(s.status) && <ButtonLink to={`/creator/submissions/${s.id}/edit`} size="sm" variant="outline" icon="edit">Edit</ButtonLink>}
            {s.status === 'draft' && <Button size="sm" variant="ghost" icon="delete" onClick={remove}>Delete</Button>}
          </div>
        </div>
        {s.admin_notes && <p className="mt-5 rounded-2xl bg-paper-100 p-4 text-sm"><b>Feedback from Sonico:</b> {s.admin_notes}</p>}

        {s.status === 'approved' && (
          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold">Production</p>
            <ol className="grid grid-cols-4 gap-2">
              {PRODUCTION_STEPS.map((p, i) => (
                <li key={p} className="text-center">
                  <div className={`h-1.5 rounded-full ${i <= prodIdx ? 'bg-moss' : 'bg-paper-200'}`} />
                  <span className={`mt-2 block text-xs ${i <= prodIdx ? 'font-semibold text-moss' : 'text-ink-400'}`}>{productionStatusMeta[p].label}</span>
                </li>
              ))}
            </ol>
            {s.product_id && <ProductLink productId={s.product_id} />}
          </div>
        )}
      </Card>

      {agreements.data?.map((a) => <AgreementCard key={a.id} agreement={a} onChange={agreements.reload} />)}

      <Card className="p-6">
        <h3 className="font-display font-bold">Design brief</h3>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-700">{s.description}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {s.materials && <div><dt className="text-ink-400">Materials</dt><dd>{s.materials}</dd></div>}
          {s.target_price && <div><dt className="text-ink-400">Suggested price</dt><dd>{money(s.target_price)}</dd></div>}
        </dl>
        {s.image_paths.length > 0 && <div className="mt-5 flex flex-wrap gap-3">{s.image_paths.map((p) => <PrivateThumb key={p} path={p} />)}</div>}
        {s.model_path && <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-paper-100 px-3 py-1.5 text-sm"><Icon name="view_in_ar" size={18} />3D model attached</p>}
      </Card>
    </div>
  );
}

function ProductLink({ productId }: { productId: string }) {
  const p = useQuery(async () => unwrap(await supabase.from('products').select('slug, name, is_active').eq('id', productId).maybeSingle()) as { slug: string; name: string; is_active: boolean } | null, [productId]);
  if (!p.data?.is_active) return null;
  return <Link to={`/product/${p.data.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-moss">View live product: {p.data.name}<Icon name="arrow_forward" size={18} /></Link>;
}

function AgreementCard({ agreement: a, onChange }: { agreement: CommissionAgreement; onChange: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const meta = agreementStatusMeta[a.status];

  const respond = async (accept: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc('respond_to_agreement', { p_agreement: a.id, p_accept: accept });
    setBusy(false);
    setOpen(false);
    if (error) toast(error.message, 'error');
    else { toast(accept ? 'Agreement accepted' : 'Agreement declined'); onChange(); }
  };

  return (
    <Card className={`p-6 ${a.status === 'proposed' ? 'ring-2 ring-amber-300' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-moss-50 text-moss"><Icon name="handshake" /></span>
          <div>
            <p className="font-display text-lg font-bold">{Number(a.royalty_percent)}% royalty</p>
            <p className="text-xs text-ink-500">of item revenue on eligible sales · proposed {date(a.created_at)}</p>
          </div>
        </div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>
      <p className="mt-4 whitespace-pre-line rounded-2xl bg-paper-100 p-4 text-sm text-ink-700">{a.terms}</p>
      {(a.starts_at || a.ends_at) && <p className="mt-2 text-xs text-ink-500">Term: {date(a.starts_at)} – {a.ends_at ? date(a.ends_at) : 'open-ended'}</p>}
      {a.status === 'proposed' && (
        <div className="mt-4 flex gap-3">
          <Button variant="moss" icon="check" onClick={() => setOpen(true)}>Review & accept</Button>
          <Button variant="outline" loading={busy} onClick={() => respond(false)}>Decline</Button>
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Accept agreement">
        <p className="text-sm text-ink-700">
          You agree that Sonico may manufacture and sell this design under the Sonico brand, and that you will receive <b>{Number(a.royalty_percent)}%</b> of item revenue on eligible sales under the terms above.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="moss" loading={busy} onClick={() => respond(true)}>I accept</Button>
        </div>
      </Modal>
    </Card>
  );
}

export function CreatorAgreements() {
  const agreements = useQuery(async () => unwrap(await supabase.from('commission_agreements').select('*').order('created_at', { ascending: false })) as CommissionAgreement[], []);
  if (agreements.loading) return <PageLoader />;
  if (!agreements.data?.length) return <EmptyState icon="handshake" title="No agreements yet" text="When a design is approved, its royalty agreement appears here for you to accept." />;
  return <div className="space-y-4">{agreements.data.map((a) => <AgreementCard key={a.id} agreement={a} onChange={agreements.reload} />)}</div>;
}

export function CreatorEarnings() {
  const earnings = useQuery(fetchEarnings, []);
  const payouts = useQuery(async () => unwrap(await supabase.from('creator_payouts').select('*').order('paid_at', { ascending: false })) as CreatorPayout[], []);
  const sales = useQuery(async () => unwrap(await supabase.from('creator_sales').select('*').order('paid_at', { ascending: false })) as CreatorSale[], []);
  if (earnings.loading) return <PageLoader />;

  const e = earnings.data ?? [];
  const total = (s: string) => e.filter((x) => x.status === s).reduce((t, x) => t + Number(x.amount), 0);
  const saleByItem = new Map((sales.data ?? []).map((s) => [s.order_item_id, s]));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon="hourglass_top" label="Pending" value={money(total('pending'))} hint="Inside the 30-day return window" />
        <StatTile icon="account_balance_wallet" label="Payable" value={money(total('payable'))} hint="Included in the next payout" tone="ink" />
        <StatTile icon="paid" label="Paid out" value={money(total('paid'))} tone="moss" />
      </div>
      <p className="flex items-start gap-2 rounded-2xl bg-white p-4 text-sm text-ink-500 shadow-soft">
        <Icon name="info" className="text-moss" />Payouts are processed manually by the Sonico team to the payout details in your profile. Every payout and the earnings it covers are listed below.
      </p>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold">Earnings by sale</h2>
        <Table head={['Date', 'Order', 'Product', 'Sale', 'Rate', 'Earning', 'Status']}
          empty={e.length === 0 && <p className="p-6 text-center text-sm text-ink-500">No earnings yet.</p>}>
          {e.map((x) => {
            const s = saleByItem.get(x.order_item_id);
            return (
              <tr key={x.id}>
                <td className="px-4 py-3">{date(x.created_at)}</td>
                <td className="px-4 py-3 font-mono text-xs">{s?.order_number ?? '—'}</td>
                <td className="px-4 py-3">{s ? `${s.product_name} × ${s.quantity}` : '—'}</td>
                <td className="px-4 py-3">{money(x.sale_amount, x.currency)}</td>
                <td className="px-4 py-3">{Number(x.royalty_percent)}%</td>
                <td className="px-4 py-3 font-semibold">{money(x.amount, x.currency)}</td>
                <td className="px-4 py-3"><Badge tone={earningStatusMeta[x.status].tone}>{earningStatusMeta[x.status].label}</Badge></td>
              </tr>
            );
          })}
        </Table>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold">Payout history</h2>
        <Table head={['Date', 'Amount', 'Method', 'Reference', 'Status']}
          empty={!payouts.data?.length && <p className="p-6 text-center text-sm text-ink-500">No payouts yet.</p>}>
          {payouts.data?.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3">{date(p.paid_at)}</td>
              <td className="px-4 py-3 font-semibold">{money(p.amount, p.currency)}</td>
              <td className="px-4 py-3">{p.method}</td>
              <td className="px-4 py-3 font-mono text-xs">{p.reference ?? '—'}</td>
              <td className="px-4 py-3"><Badge tone={p.status === 'failed' ? 'red' : 'green'}>{p.status}</Badge></td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}

export function CreatorProfileSettings() {
  const { user, creator, refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ display_name: '', headline: '', bio: '', location: '', website: '', payout_notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!creator) return;
    setForm({
      display_name: creator.display_name, headline: creator.headline ?? '', bio: creator.bio ?? '',
      location: creator.location ?? '', website: creator.website ?? '', payout_notes: creator.payout_notes ?? '',
    });
  }, [creator]);

  if (!creator) return <PageLoader />;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (form.website && !/^https?:\/\//i.test(form.website)) { setError('Website must start with http:// or https://'); return; }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('creators').update({
      display_name: form.display_name.trim(), headline: form.headline.trim() || null, bio: form.bio.trim() || null,
      location: form.location.trim() || null, website: form.website.trim() || null, payout_notes: form.payout_notes.trim() || null,
    }).eq('id', creator.id);
    setBusy(false);
    if (err) { setError(err.message); return; }
    await refresh();
    toast('Creator profile saved');
  };

  const uploadAvatar = async (file: File) => {
    try {
      const url = await uploadPublic('avatars', `${user!.id}/creator-${Date.now()}.${fileExt(file)}`, file);
      await supabase.from('creators').update({ avatar_url: url }).eq('id', creator.id);
      await refresh();
      toast('Photo updated');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error');
    }
  };

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {creator.avatar_url
            ? <img src={creator.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
            : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-moss font-display text-2xl font-bold text-white">{creator.display_name[0]}</span>}
          <label className="cursor-pointer text-sm font-semibold text-moss hover:underline">
            Change photo<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </label>
        </div>
        <ButtonLink to={`/creators/${creator.slug}`} variant="outline" size="sm" icon="open_in_new">Public profile</ButtonLink>
      </div>
      <form onSubmit={save} className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Display name"><Input required maxLength={60} value={form.display_name} onChange={set('display_name')} /></Field>
          <Field label="Headline"><Input maxLength={100} value={form.headline} onChange={set('headline')} placeholder="Industrial designer & synth nerd" /></Field>
          <Field label="Location"><Input value={form.location} onChange={set('location')} /></Field>
          <Field label="Website"><Input type="url" value={form.website} onChange={set('website')} /></Field>
        </div>
        <Field label="Bio"><Textarea rows={5} maxLength={2000} value={form.bio} onChange={set('bio')} /></Field>
        <Field label="Payout details" hint="Private — visible only to you and Sonico admins. E.g. bank name, IBAN, account holder.">
          <Textarea rows={3} maxLength={1000} value={form.payout_notes} onChange={set('payout_notes')} />
        </Field>
        <FormError message={error} />
        <Button type="submit" variant="moss" loading={busy} icon="save">Save profile</Button>
      </form>
    </Card>
  );
}
