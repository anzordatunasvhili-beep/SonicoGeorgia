import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Table } from '@/components/layout/DashboardShell';
import { Badge, Card, EmptyState, StatTile } from '@/components/ui/Display';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/brand/Loader';
import { useToast } from '@/components/ui/Toast';
import { useQuery } from '@/lib/useQuery';
import { signedUrl, supabase, unwrap } from '@/lib/supabase';
import {
  agreementStatusMeta, applicationStatusMeta, date, earningStatusMeta, money, productionStatusMeta, slugify, submissionStatusMeta,
} from '@/lib/format';
import type {
  CommissionAgreement, Creator, CreatorApplication, CreatorEarning, DesignSubmission, ProductionStatus, SubmissionStatus,
} from '@/lib/types';

// ---------------------------------------------------------------- Applications
export function AdminApplications() {
  const toast = useToast();
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const apps = useQuery(async () => unwrap(await supabase.from('creator_applications').select('*, profile:profiles!creator_applications_user_id_fkey(email, full_name)').eq('status', filter).order('created_at')) as (CreatorApplication & { profile: { email: string; full_name: string | null } | null })[], [filter]);
  const [open, setOpen] = useState<(CreatorApplication & { profile: { email: string } | null }) | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const review = async (approve: boolean) => {
    if (!open) return;
    setBusy(true);
    const { error } = await supabase.rpc('review_creator_application', { p_application: open.id, p_approve: approve, p_notes: notes || null });
    setBusy(false);
    if (error) { toast(error.message, 'error'); return; }
    toast(approve ? 'Creator approved' : 'Application declined');
    setOpen(null); setNotes('');
    apps.reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === s ? 'bg-ink text-white' : 'bg-white hover:bg-ink/5'}`}>{applicationStatusMeta[s].label}</button>
        ))}
      </div>
      {apps.loading ? <PageLoader /> : !apps.data?.length ? <EmptyState icon="how_to_reg" title="Nothing here" /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {apps.data.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold">{a.display_name}</p>
                  <p className="text-xs text-ink-500">{a.profile?.email} · {a.location ?? '—'} · {date(a.created_at)}</p>
                </div>
                <Badge tone={applicationStatusMeta[a.status].tone}>{applicationStatusMeta[a.status].label}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">{a.disciplines.map((d) => <Badge key={d}>{d}</Badge>)}</div>
              <p className="mt-3 line-clamp-3 text-sm text-ink-700">{a.bio}</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={() => setOpen(a)}>{a.status === 'pending' ? 'Review' : 'View'}</Button>
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.display_name ?? ''} wide>
        {open && (
          <div className="space-y-4 text-sm">
            {open.portfolio_url && <a href={open.portfolio_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-semibold text-ember"><Icon name="link" size={18} />Portfolio</a>}
            <div><p className="font-semibold">Bio</p><p className="whitespace-pre-line text-ink-700">{open.bio}</p></div>
            <div><p className="font-semibold">Motivation</p><p className="whitespace-pre-line text-ink-700">{open.motivation}</p></div>
            {open.experience && <div><p className="font-semibold">Experience</p><p className="whitespace-pre-line text-ink-700">{open.experience}</p></div>}
            {open.status === 'pending' ? (
              <>
                <Field label="Notes to applicant (optional)"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
                <div className="flex gap-3">
                  <Button variant="moss" icon="check" loading={busy} onClick={() => review(true)}>Approve</Button>
                  <Button variant="outline" icon="close" loading={busy} onClick={() => review(false)}>Decline</Button>
                </div>
              </>
            ) : open.review_notes && <p className="rounded-2xl bg-paper-100 p-3"><b>Notes:</b> {open.review_notes}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------- Creators
export function AdminCreatorsList() {
  const toast = useToast();
  const creators = useQuery(async () => unwrap(await supabase.from('creators').select('*').order('created_at', { ascending: false })) as Creator[], []);
  const earnings = useQuery(async () => unwrap(await supabase.from('creator_earnings').select('creator_id, amount, status')) as Pick<CreatorEarning, 'creator_id' | 'amount' | 'status'>[], []);
  const totals = useMemo(() => {
    const m = new Map<string, { owed: number; paid: number }>();
    earnings.data?.forEach((e) => {
      const t = m.get(e.creator_id) ?? { owed: 0, paid: 0 };
      if (e.status === 'paid') t.paid += Number(e.amount); else if (e.status !== 'void') t.owed += Number(e.amount);
      m.set(e.creator_id, t);
    });
    return m;
  }, [earnings.data]);

  const toggle = async (c: Creator) => {
    const status = c.status === 'active' ? 'suspended' : 'active';
    if (!confirm(`${status === 'suspended' ? 'Suspend' : 'Reactivate'} ${c.display_name}?`)) return;
    const { error } = await supabase.from('creators').update({ status }).eq('id', c.id);
    if (error) toast(error.message, 'error'); else creators.reload();
  };

  return (
    <Table head={['Creator', 'Since', 'Owed', 'Paid', 'Status', '']}
      empty={creators.data?.length === 0 && <p className="p-6 text-center text-sm text-ink-500">No creators yet.</p>}>
      {creators.data?.map((c) => (
        <tr key={c.id}>
          <td className="px-4 py-3"><Link to={`/creators/${c.slug}`} className="font-semibold hover:text-ember">{c.display_name}</Link><p className="text-xs text-ink-400">{c.location ?? ''}</p></td>
          <td className="px-4 py-3">{date(c.created_at)}</td>
          <td className="px-4 py-3">{money(totals.get(c.id)?.owed ?? 0)}</td>
          <td className="px-4 py-3">{money(totals.get(c.id)?.paid ?? 0)}</td>
          <td className="px-4 py-3"><Badge tone={c.status === 'active' ? 'green' : 'red'}>{c.status}</Badge></td>
          <td className="px-4 py-3 text-right">
            <Link to={`/admin/earnings?creator=${c.id}`} className="mr-3 text-sm font-semibold text-ember">Royalties</Link>
            <button onClick={() => toggle(c)} className="text-sm font-semibold text-ink-500 hover:text-ink">{c.status === 'active' ? 'Suspend' : 'Activate'}</button>
          </td>
        </tr>
      ))}
    </Table>
  );
}

// ---------------------------------------------------------------- Submissions
type SubmissionRow = DesignSubmission & { creator: { display_name: string } | null };

export function AdminSubmissions() {
  const [status, setStatus] = useState<string>('submitted');
  const subs = useQuery(async () => {
    let q = supabase.from('design_submissions').select('*, creator:creators(display_name)').neq('status', 'draft').order('submitted_at', { ascending: false });
    if (status) q = q.eq('status', status);
    return unwrap(await q) as SubmissionRow[];
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="w-56">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All (excl. drafts)</option>
          {Object.entries(submissionStatusMeta).filter(([k]) => k !== 'draft').map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </Select>
      </div>
      <Table head={['Design', 'Creator', 'Submitted', 'Status', 'Production', '']}
        empty={subs.data?.length === 0 && <p className="p-6 text-center text-sm text-ink-500">Nothing to review.</p>}>
        {subs.data?.map((s) => (
          <tr key={s.id}>
            <td className="px-4 py-3 font-semibold">{s.title}</td>
            <td className="px-4 py-3">{s.creator?.display_name}</td>
            <td className="px-4 py-3">{date(s.submitted_at)}</td>
            <td className="px-4 py-3"><Badge tone={submissionStatusMeta[s.status].tone}>{submissionStatusMeta[s.status].label}</Badge></td>
            <td className="px-4 py-3"><Badge tone={productionStatusMeta[s.production_status].tone}>{productionStatusMeta[s.production_status].label}</Badge></td>
            <td className="px-4 py-3 text-right"><Link to={`/admin/submissions/${s.id}`} className="font-semibold text-ember">Review</Link></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

const DEFAULT_TERMS =
  'Sonico may manufacture, market and sell products based on this design under the Sonico brand. ' +
  'The creator receives the royalty percentage above, calculated on item revenue (excluding shipping and taxes) of paid orders. ' +
  'Royalties on orders that are cancelled or refunded are void. Royalties become payable after the 30-day return window and are paid out manually by Sonico. ' +
  'Either party may terminate with 60 days’ written notice; royalties on sales before termination remain payable.';

export function AdminSubmissionDetail() {
  const { id = '' } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const sub = useQuery(async () => unwrap(await supabase.from('design_submissions').select('*, creator:creators(id, display_name, slug)').eq('id', id).maybeSingle()) as (DesignSubmission & { creator: { id: string; display_name: string; slug: string } }) | null, [id]);
  const agreements = useQuery(async () => unwrap(await supabase.from('commission_agreements').select('*').eq('submission_id', id).order('created_at', { ascending: false })) as CommissionAgreement[], [id]);
  const [status, setStatus] = useState<SubmissionStatus>('in_review');
  const [production, setProduction] = useState<ProductionStatus>('not_started');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [agrOpen, setAgrOpen] = useState(false);
  const [agr, setAgr] = useState({ royalty: '8', terms: DEFAULT_TERMS, starts: '', ends: '' });
  const [files, setFiles] = useState<string[]>([]);
  const [modelLink, setModelLink] = useState<string | null>(null);

  useEffect(() => {
    const s = sub.data;
    if (!s) return;
    setStatus(s.status === 'submitted' ? 'in_review' : s.status);
    setProduction(s.production_status);
    setNotes(s.admin_notes ?? '');
    Promise.all(s.image_paths.map((p) => signedUrl(p).catch(() => ''))).then((u) => setFiles(u.filter(Boolean)));
    if (s.model_path) signedUrl(s.model_path).then(setModelLink).catch(() => setModelLink(null));
  }, [sub.data]);

  if (sub.loading) return <PageLoader />;
  const s = sub.data;
  if (!s) return <EmptyState icon="search_off" title="Submission not found" />;

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from('design_submissions').update({ status, production_status: production, admin_notes: notes || null }).eq('id', s.id);
    setBusy(false);
    if (error) toast(error.message, 'error'); else { toast('Submission updated'); sub.reload(); }
  };

  const createProduct = async () => {
    setBusy(true);
    const base = slugify(s.title) || 'creator-design';
    const { data, error } = await supabase.from('products').insert({
      name: s.title, slug: `${base}-${s.id.slice(0, 4)}`, sku: `SNC-CR-${s.id.slice(0, 6).toUpperCase()}`,
      tagline: s.summary, description: s.description, category_id: s.category_id, price: s.target_price ?? 0,
      creator_id: s.creator_id, submission_id: s.id, is_active: false, stock: 0, model_preset: 'generic',
    }).select('id').single();
    if (error) { setBusy(false); toast(error.message, 'error'); return; }
    await supabase.from('design_submissions').update({ product_id: data.id }).eq('id', s.id);
    await supabase.from('commission_agreements').update({ product_id: data.id }).eq('submission_id', s.id).is('product_id', null).in('status', ['proposed', 'active']);
    setBusy(false);
    toast('Hidden product draft created');
    navigate(`/admin/products/${data.id}`);
  };

  const propose = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from('commission_agreements').insert({
      creator_id: s.creator_id, submission_id: s.id, product_id: s.product_id, royalty_percent: Number(agr.royalty),
      terms: agr.terms, starts_at: agr.starts || null, ends_at: agr.ends || null, status: 'proposed',
    });
    setBusy(false);
    if (error) { toast(error.message, 'error'); return; }
    setAgrOpen(false);
    toast('Agreement proposed to creator');
    agreements.reload();
  };

  const terminate = async (a: CommissionAgreement) => {
    if (!confirm('Terminate this agreement? Future sales will not accrue royalties.')) return;
    const { error } = await supabase.from('commission_agreements').update({ status: 'terminated', ends_at: new Date().toISOString().slice(0, 10) }).eq('id', a.id);
    if (error) toast(error.message, 'error'); else agreements.reload();
  };

  return (
    <div className="space-y-6">
      <Link to="/admin/submissions" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink"><Icon name="arrow_back" size={18} />Submissions</Link>
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">{s.title}</h2>
            <p className="text-sm text-ink-500">by <Link to={`/creators/${s.creator.slug}`} className="font-semibold text-moss">{s.creator.display_name}</Link> · submitted {date(s.submitted_at)}</p>
          </div>
          <Badge tone={submissionStatusMeta[s.status].tone}>{submissionStatusMeta[s.status].label}</Badge>
        </div>
        {s.summary && <p className="mt-4 font-medium">{s.summary}</p>}
        <p className="mt-2 whitespace-pre-line text-sm text-ink-700">{s.description}</p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {s.materials && <div><dt className="text-ink-400">Materials</dt><dd>{s.materials}</dd></div>}
          {s.target_price && <div><dt className="text-ink-400">Suggested price</dt><dd>{money(s.target_price)}</dd></div>}
        </dl>
        <div className="mt-5 flex flex-wrap gap-3">
          {files.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer" className="h-28 w-28 overflow-hidden rounded-2xl bg-paper-100"><img src={u} alt="" className="h-full w-full object-cover" /></a>)}
        </div>
        {modelLink && <a href={modelLink} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ember"><Icon name="download" size={18} />Download 3D model</a>}
      </Card>

      <Card className="grid gap-4 p-6 sm:grid-cols-2">
        <Field label="Review status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as SubmissionStatus)}>
            {(['in_review', 'changes_requested', 'approved', 'rejected'] as SubmissionStatus[]).map((k) => <option key={k} value={k}>{submissionStatusMeta[k].label}</option>)}
          </Select>
        </Field>
        <Field label="Production status">
          <Select value={production} onChange={(e) => setProduction(e.target.value as ProductionStatus)} disabled={status !== 'approved'}>
            {Object.entries(productionStatusMeta).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </Select>
        </Field>
        <Field label="Feedback to creator" className="sm:col-span-2"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <Button loading={busy} icon="save" onClick={save}>Save review</Button>
          {s.status === 'approved' && !s.product_id && <Button variant="outline" icon="add_box" loading={busy} onClick={createProduct}>Create product draft</Button>}
          {s.product_id && <ButtonLink to={`/admin/products/${s.product_id}`} variant="outline" icon="inventory_2">Open product</ButtonLink>}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold">Commission agreements</h3>
          {s.status === 'approved' && <Button size="sm" variant="moss" icon="handshake" onClick={() => setAgrOpen(true)}>Propose agreement</Button>}
        </div>
        {!agreements.data?.length ? <p className="mt-3 text-sm text-ink-500">No agreements yet. Approve the design, then propose a royalty agreement.</p> : (
          <ul className="mt-3 divide-y divide-ink/5 text-sm">
            {agreements.data.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span><b>{Number(a.royalty_percent)}%</b> · created {date(a.created_at)}{a.responded_at && ` · responded ${date(a.responded_at)}`}{!a.product_id && <span className="ml-2 text-xs text-amber-700">(no product linked yet)</span>}</span>
                <span className="flex items-center gap-2">
                  <Badge tone={agreementStatusMeta[a.status].tone}>{a.status}</Badge>
                  {a.status === 'active' && <Button size="sm" variant="ghost" onClick={() => terminate(a)}>Terminate</Button>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={agrOpen} onClose={() => setAgrOpen(false)} title="Propose commission agreement" wide>
        <form onSubmit={propose} className="grid gap-4 sm:grid-cols-3">
          <Field label="Royalty %" hint="Max 50%."><Input required type="number" min={0.5} max={50} step={0.5} value={agr.royalty} onChange={(e) => setAgr({ ...agr, royalty: e.target.value })} /></Field>
          <Field label="Starts (optional)"><Input type="date" value={agr.starts} onChange={(e) => setAgr({ ...agr, starts: e.target.value })} /></Field>
          <Field label="Ends (optional)"><Input type="date" value={agr.ends} onChange={(e) => setAgr({ ...agr, ends: e.target.value })} /></Field>
          <Field label="Terms" className="sm:col-span-3"><Textarea rows={7} required value={agr.terms} onChange={(e) => setAgr({ ...agr, terms: e.target.value })} /></Field>
          <div className="sm:col-span-3"><Button type="submit" variant="moss" loading={busy}>Send to creator</Button></div>
        </form>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------- Royalties
export function AdminEarnings() {
  const toast = useToast();
  const params = new URLSearchParams(window.location.search);
  const [creatorId, setCreatorId] = useState(params.get('creator') ?? '');
  const creators = useQuery(async () => unwrap(await supabase.from('creators').select('id, display_name, payout_notes').order('display_name')) as Pick<Creator, 'id' | 'display_name' | 'payout_notes'>[], []);
  const earnings = useQuery(async () => {
    let q = supabase.from('creator_earnings').select('*, order:orders(order_number, status, delivered_at)').order('created_at', { ascending: false }).limit(500);
    if (creatorId) q = q.eq('creator_id', creatorId);
    return unwrap(await q) as (CreatorEarning & { order: { order_number: string; status: string; delivered_at: string | null } | null })[];
  }, [creatorId]);
  const [selected, setSelected] = useState<string[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [pay, setPay] = useState({ method: 'Bank transfer', reference: '', note: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelected([]);
  }, [creatorId]);
  const creator = creators.data?.find((c) => c.id === creatorId);
  const list = earnings.data ?? [];
  const sum = (st: string) => list.filter((e) => e.status === st).reduce((t, e) => t + Number(e.amount), 0);
  const selectedTotal = list.filter((e) => selected.includes(e.id)).reduce((t, e) => t + Number(e.amount), 0);

  // Pending → payable once the order is delivered and 30 days have passed.
  const eligible = (e: (typeof list)[number]) =>
    e.status === 'pending' && e.order?.status === 'delivered' && !!e.order.delivered_at && Date.now() - new Date(e.order.delivered_at).getTime() > 30 * 864e5;

  const markPayable = async (ids: string[]) => {
    const { error } = await supabase.from('creator_earnings').update({ status: 'payable' }).in('id', ids).eq('status', 'pending');
    if (error) toast(error.message, 'error'); else { toast(`${ids.length} earning(s) marked payable`); earnings.reload(); }
  };

  const recordPayout = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc('admin_record_payout', { p_creator: creatorId, p_earning_ids: selected, p_method: pay.method, p_reference: pay.reference || null, p_note: pay.note || null });
    setBusy(false);
    if (error) { toast(error.message, 'error'); return; }
    toast('Payout recorded');
    setPayOpen(false); setSelected([]);
    earnings.reload();
  };

  const eligibleIds = list.filter(eligible).map((e) => e.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Creator" className="w-64">
          <Select value={creatorId} onChange={(e) => setCreatorId(e.target.value)}>
            <option value="">All creators</option>
            {creators.data?.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
          </Select>
        </Field>
        {eligibleIds.length > 0 && <Button variant="outline" icon="event_available" onClick={() => markPayable(eligibleIds)}>Mark {eligibleIds.length} eligible as payable</Button>}
        {creatorId && selected.length > 0 && <Button variant="moss" icon="payments" onClick={() => setPayOpen(true)}>Record payout ({money(selectedTotal)})</Button>}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon="hourglass_top" label="Pending" value={money(sum('pending'))} />
        <StatTile icon="account_balance_wallet" label="Payable" value={money(sum('payable'))} tone="ink" />
        <StatTile icon="paid" label="Paid" value={money(sum('paid'))} tone="moss" />
      </div>
      {creator?.payout_notes && <p className="rounded-2xl bg-white p-4 text-sm shadow-soft"><b>Payout details:</b> {creator.payout_notes}</p>}
      {!creatorId && <p className="text-xs text-ink-400">Select a creator to record a payout.</p>}

      <Table head={['', 'Date', 'Order', 'Sale', 'Rate', 'Royalty', 'Status', '']}>
        {list.map((e) => (
          <tr key={e.id}>
            <td className="px-4 py-2">
              {creatorId && e.status === 'payable' && (
                <Checkbox label={<span className="sr-only">Select</span>} checked={selected.includes(e.id)}
                  onChange={(ev) => setSelected((s) => (ev.target.checked ? [...s, e.id] : s.filter((x) => x !== e.id)))} />
              )}
            </td>
            <td className="px-4 py-2">{date(e.created_at)}</td>
            <td className="px-4 py-2 font-mono text-xs"><Link to={`/admin/orders/${e.order_id}`} className="hover:text-ember">{e.order?.order_number}</Link><span className="ml-1 text-ink-400">({e.order?.status})</span></td>
            <td className="px-4 py-2">{money(e.sale_amount, e.currency)}</td>
            <td className="px-4 py-2">{Number(e.royalty_percent)}%</td>
            <td className="px-4 py-2 font-semibold">{money(e.amount, e.currency)}</td>
            <td className="px-4 py-2"><Badge tone={earningStatusMeta[e.status].tone}>{earningStatusMeta[e.status].label}</Badge></td>
            <td className="px-4 py-2 text-right">{e.status === 'pending' && <button className="text-xs font-semibold text-ember" onClick={() => markPayable([e.id])}>Make payable</button>}</td>
          </tr>
        ))}
      </Table>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={`Record payout — ${money(selectedTotal)}`}>
        <form onSubmit={recordPayout} className="space-y-4">
          <p className="text-sm text-ink-500">Record a payout you have already sent outside Sonico (e.g. bank transfer). This marks the {selected.length} selected earnings as paid.</p>
          <Field label="Method"><Input required value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} /></Field>
          <Field label="Reference"><Input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} placeholder="Bank transaction ID" /></Field>
          <Field label="Note"><Input value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} /></Field>
          <Button type="submit" variant="moss" loading={busy}>Record payout</Button>
        </form>
      </Modal>
    </div>
  );
}
