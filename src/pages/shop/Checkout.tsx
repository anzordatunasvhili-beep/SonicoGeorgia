import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Container } from '@/components/layout/Layout';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Display';
import { Checkbox, Field, FormError, Input, Textarea } from '@/components/ui/Form';
import { ProductMedia } from '@/components/product/ProductMedia';
import { PageLoader } from '@/components/brand/Loader';
import { supabase } from '@/lib/supabase';
import { money } from '@/lib/format';
import type { Address } from '@/lib/types';
import { OrderSummary } from './Cart';

const EMPTY: Address = { full_name: '', line1: '', line2: '', city: '', region: '', postal_code: '', country: 'Georgia' };

export default function Checkout() {
  const { rows, subtotal, clear, loading, lines } = useCart();
  const { user, profile, refresh } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState<Address>(EMPTY);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [save, setSave] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setEmail(profile.email);
    setPhone(profile.phone ?? '');
    setAddress({ ...EMPTY, full_name: profile.full_name ?? '', ...(profile.default_address ?? {}) });
  }, [profile]);

  if (loading && lines.length > 0 && rows.length === 0) return <PageLoader />;
  if (!loading && rows.length === 0 && !busy) return <Navigate to="/cart" replace />;

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const stockProblem = rows.some((r) => r.product.stock < r.quantity);
  const setA = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) => setAddress((a) => ({ ...a, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data: orderId, error: err } = await supabase.rpc('create_order', {
      p_items: rows.map((r) => ({ product_id: r.product.id, quantity: r.quantity })),
      p_shipping_address: address,
      p_contact_email: email.trim(),
      p_contact_phone: phone.trim() || null,
      p_note: note.trim() || null,
    });
    if (err || !orderId) {
      setBusy(false);
      setError(err?.message ?? 'Could not create the order');
      return;
    }
    if (save && user) {
      await supabase.from('profiles').update({ default_address: address, phone: phone.trim() || null }).eq('id', user.id);
      void refresh();
    }
    clear();
    navigate(`/checkout/pay/${orderId}`, { replace: true });
  };

  return (
    <Container className="py-10">
      <h1 className="font-display text-4xl font-bold">Checkout</h1>
      <ol className="mt-4 flex items-center gap-3 text-sm">
        <li className="flex items-center gap-2 font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-ember text-xs text-white">1</span>Details</li>
        <li className="h-px w-8 bg-ink/15" />
        <li className="flex items-center gap-2 text-ink-400"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/10 text-xs">2</span>Payment</li>
      </ol>

      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold">Contact</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
              <Field label="Phone"><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+995 …" /></Field>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold">Shipping address</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" className="sm:col-span-2"><Input required value={address.full_name} onChange={setA('full_name')} autoComplete="name" /></Field>
              <Field label="Address" className="sm:col-span-2"><Input required value={address.line1} onChange={setA('line1')} autoComplete="address-line1" /></Field>
              <Field label="Apartment, suite (optional)" className="sm:col-span-2"><Input value={address.line2 ?? ''} onChange={setA('line2')} autoComplete="address-line2" /></Field>
              <Field label="City"><Input required value={address.city} onChange={setA('city')} autoComplete="address-level2" /></Field>
              <Field label="Region"><Input value={address.region ?? ''} onChange={setA('region')} autoComplete="address-level1" /></Field>
              <Field label="Postal code"><Input value={address.postal_code ?? ''} onChange={setA('postal_code')} autoComplete="postal-code" /></Field>
              <Field label="Country"><Input required value={address.country} onChange={setA('country')} autoComplete="country-name" /></Field>
            </div>
            <div className="mt-4"><Checkbox label="Save as my default address" checked={save} onChange={(e) => setSave(e.target.checked)} /></div>
          </Card>
          <Card className="p-6">
            <Field label="Order note (optional)"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></Field>
          </Card>
        </div>

        <OrderSummary subtotal={subtotal} shipping={shipping}>
          <ul className="mb-4 max-h-60 space-y-3 overflow-y-auto">
            {rows.map(({ product, quantity }) => (
              <li key={product.id} className="flex items-center gap-3 text-sm">
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                  <ProductMedia product={product} iconSize={20} />
                </span>
                <span className="min-w-0 flex-1 truncate">{product.name} <span className="text-ink-400">× {quantity}</span></span>
                <span className="font-medium">{money(product.price * quantity)}</span>
              </li>
            ))}
          </ul>
          <FormError message={stockProblem ? 'Some items exceed available stock. Update your bag first.' : error} />
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={stockProblem} iconRight="lock">Continue to payment</Button>
        </OrderSummary>
      </form>
    </Container>
  );
}
