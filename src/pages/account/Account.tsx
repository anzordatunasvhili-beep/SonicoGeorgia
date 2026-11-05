import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Badge, Card, EmptyState, ErrorState, StatTile } from '@/components/ui/Display';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Checkbox, Field, FormError, Input } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Loader, PageLoader } from '@/components/brand/Loader';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@/lib/useQuery';
import { supabase, unwrap, uploadPublic, fileExt } from '@/lib/supabase';
import { applicationStatusMeta, date, money, orderStatusMeta } from '@/lib/format';
import type { Address, CreatorApplication, Order, OrderStatusEvent } from '@/lib/types';

export function AccountLayout() {
  const { profile, isCreator } = useAuth();
  return (
    <DashboardShell
      title={`Hi${profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}`}
      subtitle="Manage orders, details and your creator membership."
      links={[
        { to: '/account', label: 'Overview', icon: 'dashboard', end: true },
        { to: '/account/orders', label: 'Orders', icon: 'receipt_long' },
        { to: '/account/settings', label: 'Settings', icon: 'settings' },
        isCreator ? { to: '/creator', label: 'Creator studio', icon: 'design_services' } : { to: '/account/creator', label: 'Creator program', icon: 'design_services' },
      ]}
      header={<SignOutButton />}
    />
  );
}

function SignOutButton() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return <Button variant="outline" size="sm" icon="logout" onClick={async () => { await signOut(); navigate('/'); }}>Sign out</Button>;
}

const fetchMyOrders = async (userId: string) =>
  unwrap(await supabase.from('orders').select('*, order_items(id, product_name, quantity, product_image)').eq('user_id', userId).order('created_at', { ascending: false })) as Order[];

export function AccountOverview() {
  const { user, profile } = useAuth();
  const orders = useQuery(() => fetchMyOrders(user!.id), [user?.id]);
  const list = orders.data ?? [];
  const active = list.filter((o) => ['paid', 'processing', 'shipped'].includes(o.status));
  const spent = list.filter((o) => ['paid', 'processing', 'shipped', 'delivered'].includes(o.status)).reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon="receipt_long" label="Orders" value={list.length} />
        <StatTile icon="local_shipping" label="On the way" value={active.length} tone="moss" />
        <StatTile icon="payments" label="Total spent" value={money(spent)} tone="ink" />
      </div>
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Recent orders</h2>
          <Link to="/account/orders" className="text-sm font-semibold text-ember">View all</Link>
        </div>
        {orders.loading ? <div className="py-8 text-center"><Loader /></div> : list.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">No orders yet. <Link to="/shop" className="font-semibold text-ember">Start shopping</Link></p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/5">
            {list.slice(0, 4).map((o) => <OrderRow key={o.id} order={o} />)}
          </ul>
        )}
      </Card>
      <Card className="p-6">
        <h2 className="font-display text-lg font-bold">Account</h2>
        <p className="mt-2 text-sm text-ink-500">{profile?.email}</p>
        <ButtonLink to="/account/settings" variant="outline" size="sm" className="mt-4" icon="edit">Edit details</ButtonLink>
      </Card>
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const meta = orderStatusMeta[order.status];
  return (
    <li>
      <Link to={`/account/orders/${order.id}`} className="flex items-center gap-4 py-3 hover:opacity-80">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-paper-100"><Icon name={meta.icon} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{order.order_number}</p>
          <p className="truncate text-xs text-ink-500">{date(order.created_at)} · {order.order_items?.map((i) => i.product_name).join(', ')}</p>
        </div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <span className="hidden w-24 text-right font-semibold sm:block">{money(order.total, order.currency)}</span>
      </Link>
    </li>
  );
}

export function AccountOrders() {
  const { user } = useAuth();
  const orders = useQuery(() => fetchMyOrders(user!.id), [user?.id]);
  if (orders.loading) return <PageLoader />;
  if (orders.error) return <ErrorState message={orders.error} onRetry={orders.reload} />;
  if (!orders.data?.length) return <EmptyState icon="receipt_long" title="No orders yet" action={<ButtonLink to="/shop">Shop now</ButtonLink>} />;
  return <Card className="px-6 py-2"><ul className="divide-y divide-ink/5">{orders.data.map((o) => <OrderRow key={o.id} order={o} />)}</ul></Card>;
}

const TRACK_STEPS = [
  { status: 'paid', label: 'Payment confirmed', icon: 'paid' },
  { status: 'processing', label: 'Preparing', icon: 'inventory_2' },
  { status: 'shipped', label: 'Shipped', icon: 'local_shipping' },
  { status: 'delivered', label: 'Delivered', icon: 'home' },
] as const;

export function AccountOrderDetail() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const returning = params.get('payment') === 'return';
  const order = useQuery(async () => unwrap(await supabase.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle()) as Order | null, [id]);
  const history = useQuery(async () => unwrap(await supabase.from('order_status_history').select('*').eq('order_id', id).order('created_at')) as OrderStatusEvent[], [id]);
  const [polls, setPolls] = useState(0);

  // After returning from Flitt, poll until the payment webhook marks the order paid.
  useEffect(() => {
    if (!returning || !order.data || order.data.status !== 'pending_payment' || polls > 20) return;
    const t = setTimeout(() => { setPolls((p) => p + 1); order.reload(); history.reload(); }, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returning, order.data?.status, polls]);

  if (order.loading && !order.data) return <PageLoader />;
  if (order.error) return <ErrorState message={order.error} onRetry={order.reload} />;
  const o = order.data;
  if (!o) return <EmptyState icon="search_off" title="Order not found" />;

  const meta = orderStatusMeta[o.status];
  const reached = (s: string) => history.data?.some((h) => h.status === s) || TRACK_STEPS.findIndex((t) => t.status === o.status) >= TRACK_STEPS.findIndex((t) => t.status === s);
  const a = o.shipping_address as Address;

  return (
    <div className="space-y-6">
      <Link to="/account/orders" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink"><Icon name="arrow_back" size={18} />All orders</Link>

      {returning && o.status === 'pending_payment' && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
          <Loader size={28} /> Confirming your payment with Flitt… this usually takes a few seconds.
        </div>
      )}
      {returning && o.status === 'paid' && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
          <Icon name="check_circle" filled /> Payment received — thank you! A confirmation is on its way to {o.contact_email}.
        </div>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-400">Order</p>
            <h2 className="font-display text-2xl font-bold">{o.order_number}</h2>
            <p className="text-sm text-ink-500">Placed {date(o.created_at, true)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={meta.tone} icon={meta.icon}>{meta.label}</Badge>
            {['pending_payment', 'payment_failed'].includes(o.status) && <ButtonLink to={`/checkout/pay/${o.id}`} size="sm" icon="credit_card">Pay now</ButtonLink>}
          </div>
        </div>

        {!['cancelled', 'refunded', 'pending_payment', 'payment_failed'].includes(o.status) && (
          <ol className="mt-8 grid grid-cols-4 gap-2">
            {TRACK_STEPS.map((s) => {
              const done = reached(s.status);
              const at = history.data?.find((h) => h.status === s.status)?.created_at;
              return (
                <li key={s.status} className="flex flex-col items-center text-center">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full ${done ? 'bg-ember text-white' : 'bg-paper-200 text-ink-400'}`}><Icon name={s.icon} size={20} /></span>
                  <span className={`mt-2 text-xs font-semibold ${done ? 'text-ink' : 'text-ink-400'}`}>{s.label}</span>
                  {at && <span className="text-[11px] text-ink-400">{date(at)}</span>}
                </li>
              );
            })}
          </ol>
        )}
        {o.tracking_number && (
          <p className="mt-6 flex items-center gap-2 rounded-2xl bg-paper-100 p-3 text-sm">
            <Icon name="local_shipping" className="text-ember" />{o.carrier ?? 'Carrier'} tracking: <span className="font-mono font-semibold">{o.tracking_number}</span>
          </p>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
        <Card className="p-6">
          <h3 className="font-display font-bold">Items</h3>
          <ul className="mt-4 divide-y divide-ink/5">
            {o.order_items?.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>{i.product_name} <span className="text-ink-400">× {i.quantity}</span></span>
                <span className="font-semibold">{money(i.line_total, o.currency)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-ink/5 pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-ink-500">Subtotal</dt><dd>{money(o.subtotal, o.currency)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Shipping</dt><dd>{money(o.shipping_cost, o.currency)}</dd></div>
            <div className="flex justify-between font-bold"><dt>Total</dt><dd>{money(o.total, o.currency)}</dd></div>
          </dl>
        </Card>
        <Card className="p-6 text-sm">
          <h3 className="font-display font-bold">Shipping to</h3>
          <address className="mt-3 not-italic leading-relaxed text-ink-700">
            {a.full_name}<br />{a.line1}{a.line2 && <><br />{a.line2}</>}<br />{[a.city, a.region, a.postal_code].filter(Boolean).join(', ')}<br />{a.country}
          </address>
          <p className="mt-4 text-ink-500">{o.contact_email}{o.contact_phone && ` · ${o.contact_phone}`}</p>
          <Link to="/returns" className="mt-4 inline-flex items-center gap-1 font-semibold text-ember"><Icon name="autorenew" size={18} />Return or exchange</Link>
        </Card>
      </div>
    </div>
  );
}

export function AccountSettings() {
  const { user, profile, refresh } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [optIn, setOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pw, setPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name ?? '');
    setPhone(profile.phone ?? '');
    setOptIn(profile.marketing_opt_in);
  }, [profile]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('profiles').update({ full_name: name.trim() || null, phone: phone.trim() || null, marketing_opt_in: optIn }).eq('id', user!.id);
    setBusy(false);
    if (err) { setError(err.message); return; }
    await refresh();
    toast('Profile saved');
  };

  const uploadAvatar = async (file: File) => {
    try {
      const url = await uploadPublic('avatars', `${user!.id}/avatar-${Date.now()}.${fileExt(file)}`, file);
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user!.id);
      await refresh();
      toast('Photo updated');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error');
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { toast('Use at least 8 characters', 'error'); return; }
    setPwBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setPwBusy(false);
    if (err) toast(err.message, 'error');
    else { setPw(''); toast('Password updated'); }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="font-display text-lg font-bold">Profile</h2>
        <div className="mt-4 flex items-center gap-4">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
            : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ember-50 text-ember"><Icon name="person" size={30} /></span>}
          <label className="cursor-pointer text-sm font-semibold text-ember hover:underline">
            Change photo
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </label>
        </div>
        <form onSubmit={save} className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Field label="Email" hint="Contact support to change your sign-in email."><Input value={profile?.email ?? ''} disabled /></Field>
          <div className="flex items-end pb-2"><Checkbox label="Email me about new drops" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} /></div>
          <div className="sm:col-span-2"><FormError message={error} /></div>
          <div><Button type="submit" loading={busy} icon="save">Save changes</Button></div>
        </form>
      </Card>
      {profile?.default_address && (
        <Card className="p-6 text-sm">
          <h2 className="font-display text-lg font-bold">Default address</h2>
          <p className="mt-2 text-ink-700">{[profile.default_address.full_name, profile.default_address.line1, profile.default_address.city, profile.default_address.country].filter(Boolean).join(', ')}</p>
          <p className="mt-1 text-xs text-ink-400">Updated whenever you check out with “Save as my default address”.</p>
        </Card>
      )}
      <Card className="p-6">
        <h2 className="font-display text-lg font-bold">Password</h2>
        <form onSubmit={changePassword} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="New password" className="flex-1"><Input type="password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></Field>
          <Button type="submit" variant="dark" loading={pwBusy}>Update</Button>
        </form>
      </Card>
    </div>
  );
}

/** Creator program status for non-creators. */
export function AccountCreator() {
  const { user } = useAuth();
  const apps = useQuery(async () => unwrap(await supabase.from('creator_applications').select('*').eq('user_id', user!.id).order('created_at', { ascending: false })) as CreatorApplication[], [user?.id]);
  if (apps.loading) return <PageLoader />;
  const latest = apps.data?.[0];
  if (!latest) {
    return <EmptyState icon="design_services" title="Become a Sonico Creator" text="Submit original product designs and earn royalties on every eligible sale." action={<ButtonLink to="/creators/apply" iconRight="arrow_forward">Apply now</ButtonLink>} />;
  }
  const meta = applicationStatusMeta[latest.status];
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Your application</h2>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>
      <p className="mt-2 text-sm text-ink-500">Submitted {date(latest.created_at)} as <b>{latest.display_name}</b>.</p>
      {latest.review_notes && <p className="mt-4 rounded-2xl bg-paper-100 p-4 text-sm"><b>Reviewer notes:</b> {latest.review_notes}</p>}
      {latest.status === 'rejected' && <ButtonLink to="/creators/apply" className="mt-4" variant="outline">Apply again</ButtonLink>}
      {latest.status === 'approved' && <p className="mt-4 text-sm">Reload the page to open your creator studio.</p>}
    </Card>
  );
}
