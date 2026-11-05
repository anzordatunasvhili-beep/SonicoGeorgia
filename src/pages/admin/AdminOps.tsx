import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Table } from '@/components/layout/DashboardShell';
import { Badge, Card, EmptyState, ErrorState } from '@/components/ui/Display';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/brand/Loader';
import { useToast } from '@/components/ui/Toast';
import { useQuery } from '@/lib/useQuery';
import { supabase, unwrap } from '@/lib/supabase';
import { date, money, orderStatusMeta } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import type { Address, Order, OrderStatus, OrderStatusEvent, Profile, UserRole } from '@/lib/types';

const PAGE = 25;

export function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') ?? 1);
  const orders = useQuery(async () => {
    let query = supabase.from('orders').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const term = q.trim().replace(/[%,()]/g, '');
    if (term) query = query.or(`order_number.ilike.%${term}%,contact_email.ilike.%${term}%`);
    const res = await query.range((page - 1) * PAGE, page * PAGE - 1);
    if (res.error) throw new Error(res.error.message);
    return { rows: res.data as Order[], total: res.count ?? 0 };
  }, [status, q, page]);
  const [draft, setDraft] = useState(q);

  const set = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setParams(n); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <form className="w-full sm:w-72" onSubmit={(e) => { e.preventDefault(); set('q', draft); }}>
          <Input icon="search" placeholder="Order # or email" value={draft} onChange={(e) => setDraft(e.target.value)} />
        </form>
        <div className="w-56">
          <Select value={status} onChange={(e) => set('status', e.target.value)} aria-label="Filter status">
            <option value="">All statuses</option>
            {Object.entries(orderStatusMeta).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </Select>
        </div>
      </div>
      {orders.error ? <ErrorState message={orders.error} onRetry={orders.reload} /> : (
        <Table head={['Order', 'Date', 'Customer', 'Status', 'Total', '']}
          empty={orders.data?.rows.length === 0 && <p className="p-6 text-center text-sm text-ink-500">No orders.</p>}>
          {orders.data?.rows.map((o) => (
            <tr key={o.id}>
              <td className="px-4 py-3 font-mono text-xs font-semibold">{o.order_number}</td>
              <td className="px-4 py-3">{date(o.created_at, true)}</td>
              <td className="px-4 py-3">{(o.shipping_address as Address)?.full_name}<p className="text-xs text-ink-400">{o.contact_email}</p></td>
              <td className="px-4 py-3"><Badge tone={orderStatusMeta[o.status].tone}>{orderStatusMeta[o.status].label}</Badge></td>
              <td className="px-4 py-3 font-semibold">{money(o.total, o.currency)}</td>
              <td className="px-4 py-3 text-right"><Link to={`/admin/orders/${o.id}`} className="font-semibold text-ember">Open</Link></td>
            </tr>
          ))}
        </Table>
      )}
      {(orders.data?.total ?? 0) > PAGE && (
        <div className="flex items-center justify-center gap-3">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => set('page', String(page - 1))}>Prev</Button>
          <span className="text-sm">Page {page} / {Math.ceil(orders.data!.total / PAGE)}</span>
          <Button size="sm" variant="outline" disabled={page * PAGE >= orders.data!.total} onClick={() => set('page', String(page + 1))}>Next</Button>
        </div>
      )}
    </div>
  );
}

const FLOW: OrderStatus[] = ['paid', 'processing', 'shipped', 'delivered'];

export function AdminOrderDetail() {
  const { id = '' } = useParams();
  const toast = useToast();
  const order = useQuery(async () => unwrap(await supabase.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle()) as Order | null, [id]);
  const history = useQuery(async () => unwrap(await supabase.from('order_status_history').select('*').eq('order_id', id).order('created_at')) as OrderStatusEvent[], [id]);
  const tx = useQuery(async () => unwrap(await supabase.from('payment_transactions').select('id, order_status, amount_minor, currency, signature_ok, created_at, reference').eq('order_id', id).order('created_at', { ascending: false })) as { id: number; order_status: string; amount_minor: number; currency: string; signature_ok: boolean; created_at: string; reference: string }[], [id]);
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancel, setCancel] = useState<'cancelled' | 'refunded' | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => { if (order.data) { setCarrier(order.data.carrier ?? ''); setTracking(order.data.tracking_number ?? ''); } }, [order.data]);

  if (order.loading) return <PageLoader />;
  const o = order.data;
  if (!o) return <EmptyState icon="search_off" title="Order not found" />;
  const a = o.shipping_address as Address;
  const nextStatus = FLOW[FLOW.indexOf(o.status) + 1];

  const update = async (patch: Partial<Order>) => {
    setBusy(true);
    const { error } = await supabase.from('orders').update(patch).eq('id', o.id);
    setBusy(false);
    if (error) toast(error.message, 'error');
    else { toast('Order updated'); order.reload(); history.reload(); }
  };

  const doCancel = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc('admin_cancel_order', { p_order: o.id, p_status: cancel, p_note: note || null });
    setBusy(false);
    setCancel(null);
    if (error) toast(error.message, 'error');
    else { toast(`Order ${cancel}`); order.reload(); history.reload(); }
  };

  return (
    <div className="space-y-6">
      <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink"><Icon name="arrow_back" size={18} />Orders</Link>
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">{o.order_number}</h2>
            <p className="text-sm text-ink-500">Placed {date(o.created_at, true)}{o.paid_at && ` · paid ${date(o.paid_at, true)}`}</p>
            {o.payment_id && <p className="mt-1 font-mono text-xs text-ink-400">Flitt payment {o.payment_id}</p>}
          </div>
          <Badge tone={orderStatusMeta[o.status].tone} icon={orderStatusMeta[o.status].icon}>{orderStatusMeta[o.status].label}</Badge>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {nextStatus && <Button loading={busy} icon={orderStatusMeta[nextStatus].icon} onClick={() => update({ status: nextStatus })}>Mark {orderStatusMeta[nextStatus].label.toLowerCase()}</Button>}
          {['pending_payment', 'payment_failed', 'paid', 'processing'].includes(o.status) && <Button variant="outline" icon="block" onClick={() => setCancel('cancelled')}>Cancel</Button>}
          {['paid', 'processing', 'shipped', 'delivered'].includes(o.status) && <Button variant="outline" icon="undo" onClick={() => setCancel('refunded')}>Mark refunded</Button>}
        </div>
        <p className="mt-3 text-xs text-ink-400">Refunds must also be issued in the Flitt merchant portal; marking an order refunded here restocks items and voids unpaid creator royalties.</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-6">
          <h3 className="font-display font-bold">Items</h3>
          <ul className="mt-3 divide-y divide-ink/5 text-sm">
            {o.order_items?.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-3">
                <span>{i.product_name} × {i.quantity}<span className="block font-mono text-xs text-ink-400">{i.product_sku}{i.royalty_percent ? ` · creator royalty ${i.royalty_percent}%` : ''}</span></span>
                <span className="font-semibold">{money(i.line_total, o.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-ink/5 pt-3 text-sm">
            <div className="flex justify-between"><span className="text-ink-500">Shipping</span><span>{money(o.shipping_cost, o.currency)}</span></div>
            <div className="flex justify-between font-bold"><span>Total</span><span>{money(o.total, o.currency)}</span></div>
          </div>
          {o.customer_note && <p className="mt-4 rounded-2xl bg-paper-100 p-3 text-sm"><b>Customer note:</b> {o.customer_note}</p>}
        </Card>
        <div className="space-y-6">
          <Card className="p-6 text-sm">
            <h3 className="font-display font-bold">Ship to</h3>
            <address className="mt-2 not-italic leading-relaxed">{a.full_name}<br />{a.line1}{a.line2 && <>, {a.line2}</>}<br />{[a.city, a.region, a.postal_code].filter(Boolean).join(', ')}<br />{a.country}</address>
            <p className="mt-2 text-ink-500">{o.contact_email}{o.contact_phone && ` · ${o.contact_phone}`}</p>
          </Card>
          <Card className="p-6">
            <h3 className="font-display font-bold">Tracking</h3>
            <div className="mt-3 space-y-3">
              <Input placeholder="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
              <Input placeholder="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
              <Button size="sm" variant="dark" loading={busy} onClick={() => update({ carrier: carrier || null, tracking_number: tracking || null })}>Save tracking</Button>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-display font-bold">Status history</h3>
          <ol className="mt-3 space-y-3 text-sm">
            {history.data?.map((h) => (
              <li key={h.id} className="flex gap-3">
                <Icon name={orderStatusMeta[h.status].icon} size={20} className="text-ember" />
                <span><b>{orderStatusMeta[h.status].label}</b> · {date(h.created_at, true)}{h.note && <span className="block text-ink-500">{h.note}</span>}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card className="p-6">
          <h3 className="font-display font-bold">Payment callbacks</h3>
          {tx.data?.length ? (
            <ul className="mt-3 divide-y divide-ink/5 text-sm">
              {tx.data.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                  <span>{t.order_status || '—'} · {t.amount_minor != null ? money(t.amount_minor / 100, t.currency || o.currency) : '—'}</span>
                  <span className="flex items-center gap-2 text-xs text-ink-400">{date(t.created_at, true)}<Badge tone={t.signature_ok ? 'green' : 'red'}>{t.signature_ok ? 'signed' : 'bad sig'}</Badge></span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-ink-500">No callbacks received yet.</p>}
        </Card>
      </div>

      <Modal open={!!cancel} onClose={() => setCancel(null)} title={cancel === 'refunded' ? 'Mark as refunded' : 'Cancel order'}>
        <form onSubmit={doCancel} className="space-y-4">
          <Field label="Note (shown in status history)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <Button type="submit" variant="danger" loading={busy}>Confirm</Button>
        </form>
      </Modal>
    </div>
  );
}

export function AdminUsers() {
  const toast = useToast();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const users = useQuery(async () => {
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200);
    const term = q.trim().replace(/[%,()]/g, '');
    if (term) query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
    if (role) query = query.eq('role', role);
    return unwrap(await query) as Profile[];
  }, [q, role]);

  const changeRole = async (p: Profile, next: UserRole) => {
    if (p.id === user?.id) { toast('You cannot change your own role', 'error'); return; }
    if (!confirm(`Change ${p.email} to ${next}?`)) return;
    const { error } = await supabase.from('profiles').update({ role: next }).eq('id', p.id);
    if (error) toast(error.message, 'error'); else { toast('Role updated'); users.reload(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="w-full sm:w-72"><Input icon="search" placeholder="Email or name" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="w-44"><Select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role"><option value="">All roles</option><option value="customer">Customers</option><option value="creator">Creators</option><option value="admin">Admins</option></Select></div>
      </div>
      <Table head={['User', 'Joined', 'Role', '']}>
        {users.data?.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-3"><p className="font-semibold">{p.full_name ?? '—'}</p><p className="text-xs text-ink-400">{p.email}</p></td>
            <td className="px-4 py-3">{date(p.created_at)}</td>
            <td className="px-4 py-3"><Badge tone={p.role === 'admin' ? 'ember' : p.role === 'creator' ? 'green' : 'neutral'}>{p.role}</Badge></td>
            <td className="px-4 py-3 text-right">
              <select className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs" value={p.role} disabled={p.id === user?.id}
                onChange={(e) => changeRole(p, e.target.value as UserRole)} aria-label={`Role for ${p.email}`}>
                <option value="customer">customer</option><option value="creator">creator</option><option value="admin">admin</option>
              </select>
            </td>
          </tr>
        ))}
      </Table>
      <p className="text-xs text-ink-400">Creator studio access also requires an active creator record — approve an application to create one.</p>
    </div>
  );
}

export function AdminMessages() {
  const msgs = useQuery(async () => unwrap(await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100)) as { id: string; name: string; email: string; topic: string; message: string; handled: boolean; created_at: string }[], []);
  const toggle = async (id: string, handled: boolean) => {
    await supabase.from('contact_messages').update({ handled }).eq('id', id);
    msgs.reload();
  };
  if (msgs.loading) return <PageLoader />;
  if (!msgs.data?.length) return <EmptyState icon="mail" title="No messages" />;
  return (
    <div className="space-y-3">
      {msgs.data.map((m) => (
        <Card key={m.id} className={`p-5 ${m.handled ? 'opacity-60' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{m.name} <a href={`mailto:${m.email}`} className="text-sm font-normal text-ember">{m.email}</a></p>
            <div className="flex items-center gap-2"><Badge>{m.topic}</Badge><span className="text-xs text-ink-400">{date(m.created_at, true)}</span></div>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm text-ink-700">{m.message}</p>
          <Button size="sm" variant="ghost" className="mt-2" icon={m.handled ? 'undo' : 'done'} onClick={() => toggle(m.id, !m.handled)}>{m.handled ? 'Reopen' : 'Mark handled'}</Button>
        </Card>
      ))}
    </div>
  );
}
