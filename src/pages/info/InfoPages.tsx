import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Container, PageHeader } from '@/components/layout/Layout';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Display';
import { Field, FormError, Input, Select, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { LogoMark } from '@/components/brand/Logo';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

/** Legal/policy copy is a starting template — have it reviewed for your jurisdiction before launch. */
const SUPPORT_EMAIL = 'support@sonico.ge';
const UPDATED = '5 November 2026';

function Prose({ children }: { children: ReactNode }) {
  return (
    <Container className="py-12">
      <div className="max-w-3xl space-y-5 leading-relaxed text-ink-700 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </Container>
  );
}

export function About() {
  return (
    <>
      <PageHeader eyebrow="About Sonico" title="We build things you listen to." text="Sonico is an audio brand from Georgia making headphones, speakers, turntables and playful sound objects — many of them designed by independent creators." />
      <Container className="py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ['graphic_eq', 'Sound first', 'Every product is tuned and listened to by people who care about music before it’s about specs.'],
            ['handyman', 'Built to last', 'Replaceable pads, cables and batteries wherever we can. Two-year warranty on everything.'],
            ['diversity_3', 'Made with creators', 'Our creator program turns independent designers’ ideas into real products — and shares the revenue.'],
          ].map(([icon, title, text]) => (
            <Card key={title} className="p-7">
              <Icon name={icon} size={32} className="text-ember" />
              <h2 className="mt-4 font-display text-xl font-bold">{title}</h2>
              <p className="mt-2 text-sm text-ink-500">{text}</p>
            </Card>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-center gap-6 rounded-4xl bg-ink px-6 py-14 text-center text-white">
          <LogoMark animated size={56} className="text-ember" />
          <p className="max-w-2xl font-display text-2xl font-bold sm:text-3xl">“Hear beyond limits” isn’t a slogan about volume. It’s about noticing the detail you didn’t know was there.</p>
          <ButtonLink to="/creators" variant="primary" iconRight="arrow_forward">Meet the creator program</ButtonLink>
        </div>
      </Container>
    </>
  );
}

export function Contact() {
  const { user, profile } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', topic: 'general', message: '' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('contact_messages').insert({
      user_id: user?.id ?? null,
      name: form.name.trim() || profile?.full_name || 'Customer',
      email: form.email.trim() || profile?.email,
      topic: form.topic,
      message: form.message.trim(),
    });
    setBusy(false);
    if (err) setError(err.message); else setSent(true);
  };

  return (
    <>
      <PageHeader eyebrow="Contact" title="Talk to a human" text="We usually reply within one business day." />
      <Container className="grid gap-8 py-12 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          {[
            ['mail', 'Email', SUPPORT_EMAIL],
            ['schedule', 'Hours', 'Mon–Fri, 10:00–19:00 (GET)'],
            ['location_on', 'Studio', 'Tbilisi, Georgia'],
          ].map(([icon, label, value]) => (
            <div key={label} className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-soft">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ember-50 text-ember"><Icon name={icon} /></span>
              <div><p className="text-xs text-ink-400">{label}</p><p className="font-semibold">{value}</p></div>
            </div>
          ))}
          <p className="text-sm text-ink-500">Looking for an order? <Link to="/account/orders" className="font-semibold text-ember">Track it here</Link>.</p>
        </div>
        <Card className="p-6 sm:p-8">
          {sent ? (
            <div className="py-10 text-center"><Icon name="mark_email_read" size={48} className="text-ember" /><p className="mt-3 font-display text-xl font-bold">Message sent</p><p className="text-sm text-ink-500">We’ll get back to you by email.</p></div>
          ) : (
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <Field label="Name"><Input required value={form.name || profile?.full_name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" required value={form.email || profile?.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Topic" className="sm:col-span-2">
                <Select value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                  <option value="general">General question</option><option value="order">Order & delivery</option><option value="return">Return or warranty</option>
                  <option value="creator">Creator program</option><option value="press">Press & partnerships</option>
                </Select>
              </Field>
              <Field label="Message" className="sm:col-span-2"><Textarea required minLength={10} maxLength={5000} rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
              <div className="sm:col-span-2"><FormError message={error} /></div>
              <div><Button type="submit" loading={busy} iconRight="send">Send message</Button></div>
            </form>
          )}
        </Card>
      </Container>
    </>
  );
}

export const FAQ_ITEMS: [string, string][] = [
  ['How long does delivery take?', 'Orders within Georgia arrive in 1–3 business days. International delivery times depend on destination; see the Shipping page.'],
  ['How do I pay?', 'We accept Visa, Mastercard and supported wallets through Flitt’s secure checkout. Your card details never reach our servers.'],
  ['Can I return a product?', 'Yes — within 30 days of delivery, in original condition and packaging. See the Returns page for details.'],
  ['What warranty do you offer?', 'Every Sonico product carries a two-year limited warranty against manufacturing defects.'],
  ['How do I track my order?', 'Sign in and open Account → Orders. Tracking numbers appear as soon as your order ships.'],
  ['What is the 3D viewer?', 'On product pages you can rotate, zoom and “explode” products to see how they are built. Models only load when you open a product.'],
  ['How does the creator program work?', 'Approved creators submit designs; if we produce one, the creator earns an agreed royalty on eligible sales. See the Creators page.'],
];

export function FAQ() {
  return (
    <>
      <PageHeader eyebrow="Support" title="Frequently asked questions" />
      <Container className="py-12">
        <div className="max-w-3xl space-y-3">
          {FAQ_ITEMS.map(([q, a]) => (
            <details key={q} className="group rounded-2xl bg-white p-5 shadow-soft">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{q}<Icon name="expand_more" className="shrink-0 transition group-open:rotate-180" /></summary>
              <p className="mt-3 text-sm text-ink-500">{a}</p>
            </details>
          ))}
        </div>
      </Container>
    </>
  );
}

export function Help() {
  const topics = [
    ['local_shipping', 'Shipping', '/shipping'], ['autorenew', 'Returns', '/returns'], ['receipt_long', 'Track an order', '/account/orders'],
    ['help', 'FAQ', '/faq'], ['design_services', 'Creator program', '/creators'], ['mail', 'Contact us', '/contact'],
  ];
  return (
    <>
      <PageHeader eyebrow="Help center" title="How can we help?" />
      <Container className="py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map(([icon, label, to]) => (
            <Link key={label} to={to} className="group flex items-center gap-4 rounded-3xl bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-50 text-ember"><Icon name={icon} /></span>
              <span className="font-semibold">{label}</span>
              <Icon name="arrow_forward" className="ml-auto text-ink-300 transition group-hover:text-ember" />
            </Link>
          ))}
        </div>
      </Container>
    </>
  );
}

export function Shipping() {
  return (
    <>
      <PageHeader eyebrow="Policies" title="Shipping" text={`Last updated ${UPDATED}`} />
      <Prose>
        <h2>Rates</h2>
        <ul><li>Free standard shipping on orders of ₾150 or more.</li><li>Orders under ₾150: flat ₾10.</li></ul>
        <h2>Processing</h2>
        <p>Orders are prepared within 1–2 business days after payment is confirmed. You’ll see the status change to “Shipped” with a tracking number in your account.</p>
        <h2>Delivery times</h2>
        <ul><li>Tbilisi: 1–2 business days.</li><li>Rest of Georgia: 2–3 business days.</li><li>International: shown at checkout where available.</li></ul>
        <h2>Problems with delivery</h2>
        <p>If a parcel is late or arrives damaged, <Link to="/contact" className="font-semibold text-ember">contact us</Link> within 7 days with your order number.</p>
      </Prose>
    </>
  );
}

export function Returns() {
  return (
    <>
      <PageHeader eyebrow="Policies" title="Returns & refunds" text={`Last updated ${UPDATED}`} />
      <Prose>
        <h2>30-day returns</h2>
        <p>You can return most items within 30 days of delivery if they are in their original condition and packaging. For hygiene reasons, in-ear products must be unopened unless faulty.</p>
        <h2>How to return</h2>
        <ul><li>Contact us with your order number and the items you want to return.</li><li>We’ll send return instructions and a label where applicable.</li><li>Refunds are issued to the original payment method within 5–10 business days after we receive the item.</li></ul>
        <h2>Warranty</h2>
        <p>All Sonico products include a two-year limited warranty covering manufacturing defects. This does not affect your statutory rights.</p>
      </Prose>
    </>
  );
}

export function Privacy() {
  return (
    <>
      <PageHeader eyebrow="Legal" title="Privacy policy" text={`Last updated ${UPDATED}`} />
      <Prose>
        <p>This policy explains what personal data Sonico collects, why, and your rights. Template text — review with counsel before launch.</p>
        <h2>What we collect</h2>
        <ul>
          <li>Account data: name, email, phone, password (hashed by our auth provider).</li>
          <li>Order data: shipping address, items, amounts and order status.</li>
          <li>Payment data: processed by Flitt. We receive a payment reference and status, never your full card number.</li>
          <li>Creator data: applications, submitted designs and files, payout details you provide.</li>
        </ul>
        <h2>Why we use it</h2>
        <ul><li>To fulfil orders and provide support.</li><li>To operate the creator program and calculate royalties.</li><li>To send marketing emails only if you opt in.</li></ul>
        <h2>Processors</h2>
        <p>We use Supabase (database, authentication, file storage) and Flitt (payments). Data is shared with carriers only as needed to deliver your order.</p>
        <h2>Your rights</h2>
        <p>You can access, correct or delete your data. Email <a className="font-semibold text-ember" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
        <h2>Cookies & storage</h2>
        <p>We use essential browser storage to keep you signed in and remember your bag. No third-party advertising trackers.</p>
      </Prose>
    </>
  );
}

export function Terms() {
  return (
    <>
      <PageHeader eyebrow="Legal" title="Terms of service" text={`Last updated ${UPDATED}`} />
      <Prose>
        <p>By using sonico.ge you agree to these terms. Template text — review with counsel before launch.</p>
        <h2>Orders & pricing</h2>
        <p>Prices are shown in Georgian lari (₾) and confirmed by our server when you place an order. An order is accepted once payment is confirmed by our payment provider. We may cancel and refund orders affected by pricing errors or stock shortages.</p>
        <h2>Accounts</h2>
        <p>You are responsible for keeping your login credentials secure.</p>
        <h2 id="creators">Creator program</h2>
        <ul>
          <li>Creators must submit only original work they have the right to license.</li>
          <li>Submitting a design does not transfer any rights. Rights are granted only through a commission agreement the creator explicitly accepts.</li>
          <li>Approved products are manufactured and sold under the Sonico brand. The creator is credited on the product page.</li>
          <li>Royalties are the percentage stated in the accepted agreement, calculated on item revenue of paid orders; cancelled or refunded sales are excluded.</li>
          <li>Earnings become payable after the return window. Payouts are currently arranged manually by Sonico and recorded in the creator dashboard; there are no automatic payouts.</li>
          <li>Sonico may decline any submission without obligation.</li>
        </ul>
        <h2>Liability</h2>
        <p>To the extent permitted by law, Sonico’s liability is limited to the amount you paid for the product concerned.</p>
      </Prose>
    </>
  );
}

export function NotFound() {
  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <p className="font-display text-[120px] font-bold leading-none text-ink/10">404</p>
      <h1 className="font-display text-3xl font-bold">This track doesn’t exist</h1>
      <p className="mt-2 text-ink-500">The page may have moved or never existed.</p>
      <ButtonLink to="/" className="mt-6" icon="home">Back home</ButtonLink>
    </Container>
  );
}
