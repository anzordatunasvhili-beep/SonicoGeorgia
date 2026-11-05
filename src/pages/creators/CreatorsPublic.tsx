import { useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Container } from '@/components/layout/Layout';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge, Card, EmptyState, SectionHeading } from '@/components/ui/Display';
import { Checkbox, Field, FormError, Input, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { PageLoader } from '@/components/brand/Loader';
import { ProductGrid } from '@/components/product/ProductCard';
import { useQuery } from '@/lib/useQuery';
import { supabase, unwrap } from '@/lib/supabase';
import { PRODUCT_LIST_COLUMNS } from '@/lib/catalog';
import { applicationStatusMeta, date } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import type { CreatorApplication, CreatorProfile, Product } from '@/lib/types';

const STEPS = [
  { icon: 'how_to_reg', title: 'Apply', text: 'Tell us about yourself and your design work. We review every application personally.' },
  { icon: 'draw', title: 'Submit designs', text: 'Upload sketches, renders, a description and an optional 3D model for each product idea.' },
  { icon: 'fact_check', title: 'Review & agreement', text: 'Our product team reviews feasibility. Approved designs get a written royalty agreement you accept in your studio.' },
  { icon: 'precision_manufacturing', title: 'We produce it', text: 'Sonico handles engineering, manufacturing, inventory, sales and support. Track production status live.' },
  { icon: 'payments', title: 'You earn', text: 'You receive the agreed percentage of eligible sales, visible per order in your creator dashboard.' },
];

const FAQ = [
  ['Who owns the product?', 'Approved products are manufactured and sold under the Sonico brand. You are credited as the designer on the product page and your public creator profile.'],
  ['How much do I earn?', 'Each approved design gets its own royalty percentage, agreed in writing before production. It is calculated on the item revenue of eligible (paid, non-refunded) sales.'],
  ['When are royalties paid?', 'Earnings become payable after the return window closes. Payouts are currently arranged and recorded manually by our team; every payout and the earnings it covers appear in your dashboard.'],
  ['What happens if my design is not selected?', 'You keep all rights to designs that are not approved. We may leave feedback so you can revise and resubmit.'],
  ['Do I need a 3D model?', 'No. Sketches and a clear description are enough to start. A .glb model helps us evaluate faster and can be shown on the product page.'],
];

export function CreatorsLanding() {
  const { isCreator } = useAuth();
  const creators = useQuery(async () => unwrap(await supabase.from('creator_profiles').select('*').order('created_at').limit(8)) as CreatorProfile[], []);

  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute -right-40 top-10 h-[560px] w-[560px] rounded-full" style={{ background: 'repeating-radial-gradient(circle, #1f1f22 0 3px, #141416 3px 7px)' }} />
        <motion.div className="pointer-events-none absolute right-[180px] top-[235px] h-32 w-32 rounded-full bg-ember" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} />
        <Container className="relative py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Join us · Sonico Creators</p>
          <h1 className="mt-4 max-w-2xl font-display text-5xl font-bold leading-[1.05] sm:text-6xl">Your design. Our factory. Shared success.</h1>
          <p className="mt-6 max-w-xl text-lg text-white/70">
            Sonico partners with independent designers to bring original sound products to life. You design, we manufacture and sell — and you earn an agreed royalty on every eligible sale.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {isCreator
              ? <ButtonLink to="/creator" size="lg" iconRight="arrow_forward">Open your studio</ButtonLink>
              : <ButtonLink to="/creators/apply" size="lg" iconRight="arrow_forward">Apply to become a creator</ButtonLink>}
            <a href="#how" className="inline-flex items-center gap-2 rounded-full px-5 py-3 font-semibold text-white/80 hover:text-white">How it works<Icon name="south" size={18} /></a>
          </div>
        </Container>
      </section>

      <Container className="py-20" >
        <div id="how" className="scroll-mt-24">
          <SectionHeading eyebrow="The process" title="From sketch to shelf in five steps" />
          <div className="grid gap-4 md:grid-cols-5">
            {STEPS.map((s, i) => (
              <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <Card className="h-full p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ember-50 text-ember"><Icon name={s.icon} /></span>
                  <p className="mt-4 text-xs font-semibold text-ink-400">Step {i + 1}</p>
                  <h3 className="font-display text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm text-ink-500">{s.text}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-20 grid gap-6 lg:grid-cols-3">
          {[
            ['verified', 'Transparent royalties', 'Every agreement states the exact percentage and basis. Every sale is itemised in your dashboard.'],
            ['factory', 'We handle production', 'Engineering, tooling, certification, inventory, fulfilment and support are on us.'],
            ['campaign', 'Credited & promoted', 'Your name on the product page, a public creator profile and launch campaigns.'],
          ].map(([icon, title, text]) => (
            <div key={title} className="rounded-3xl bg-moss p-7 text-white">
              <Icon name={icon} size={32} className="text-ember" />
              <h3 className="mt-4 font-display text-xl font-bold">{title}</h3>
              <p className="mt-2 text-sm text-white/70">{text}</p>
            </div>
          ))}
        </div>

        {(creators.data?.length ?? 0) > 0 && (
          <div className="mt-20">
            <SectionHeading eyebrow="Community" title="Meet our creators" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {creators.data!.map((c) => (
                <Link key={c.id} to={`/creators/${c.slug}`} className="rounded-3xl bg-white p-5 text-center shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                  {c.avatar_url
                    ? <img src={c.avatar_url} alt="" className="mx-auto h-20 w-20 rounded-full object-cover" />
                    : <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-moss font-display text-2xl font-bold text-white">{c.display_name[0]}</span>}
                  <p className="mt-3 font-semibold">{c.display_name}</p>
                  {c.headline && <p className="line-clamp-1 text-xs text-ink-500">{c.headline}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-20 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <SectionHeading eyebrow="Questions" title="Creator FAQ" />
            <p className="text-sm text-ink-500">Read the full <Link to="/terms" className="font-semibold text-ember">terms</Link> or <Link to="/contact" className="font-semibold text-ember">contact us</Link>.</p>
          </div>
          <div className="space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-2xl bg-white p-5 shadow-soft">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">{q}<Icon name="expand_more" className="transition group-open:rotate-180" /></summary>
                <p className="mt-3 text-sm text-ink-500">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}

const DISCIPLINES = ['Industrial design', 'Audio engineering', 'Electronics', 'Graphic / visual', '3D modelling', 'Music / artist'];

export function CreatorApply() {
  const { user, isCreator } = useAuth();
  const existing = useQuery(async () => unwrap(await supabase.from('creator_applications').select('*').eq('user_id', user!.id).eq('status', 'pending').maybeSingle()) as CreatorApplication | null, [user?.id]);
  const [form, setForm] = useState({ display_name: '', portfolio_url: '', location: '', bio: '', motivation: '', experience: '' });
  const [disc, setDisc] = useState<string[]>([]);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (isCreator) return <Navigate to="/creator" replace />;
  if (existing.loading) return <PageLoader />;

  const pending = existing.data;
  if (pending || done) {
    const meta = applicationStatusMeta.pending;
    return (
      <Container className="py-16">
        <Card className="mx-auto max-w-xl p-8 text-center">
          <Icon name="hourglass_top" size={48} className="text-ember" />
          <h1 className="mt-3 font-display text-2xl font-bold">Application received</h1>
          <Badge tone={meta.tone} className="mt-3">{meta.label}</Badge>
          <p className="mt-4 text-sm text-ink-500">
            {pending ? `Submitted ${date(pending.created_at)}.` : ''} We review applications within 10 business days. You’ll find the decision in your account.
          </p>
          <ButtonLink to="/account/creator" variant="outline" className="mt-6">View status</ButtonLink>
        </Card>
      </Container>
    );
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!agree) { setError('Please accept the creator program terms.'); return; }
    if (form.portfolio_url && !/^https?:\/\//i.test(form.portfolio_url)) { setError('Portfolio link must start with http:// or https://'); return; }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('creator_applications').insert({
      user_id: user!.id,
      display_name: form.display_name.trim(),
      portfolio_url: form.portfolio_url.trim() || null,
      location: form.location.trim() || null,
      bio: form.bio.trim(),
      motivation: form.motivation.trim(),
      experience: form.experience.trim() || null,
      disciplines: disc,
    });
    setBusy(false);
    if (err) setError(err.message);
    else setDone(true);
  };

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Creator application</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Tell us about you</h1>
        <p className="mt-2 text-ink-500">Takes about five minutes. You can submit designs once you’re approved.</p>
        <Card className="mt-8 p-6 sm:p-8">
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Creator / studio name" hint="Shown publicly on your products."><Input required maxLength={60} value={form.display_name} onChange={set('display_name')} /></Field>
              <Field label="Location"><Input value={form.location} onChange={set('location')} placeholder="Tbilisi, Georgia" /></Field>
            </div>
            <Field label="Portfolio link"><Input type="url" value={form.portfolio_url} onChange={set('portfolio_url')} placeholder="https://" /></Field>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Disciplines</legend>
              <div className="flex flex-wrap gap-2">
                {DISCIPLINES.map((d) => {
                  const on = disc.includes(d);
                  return (
                    <button type="button" key={d} aria-pressed={on} onClick={() => setDisc((v) => on ? v.filter((x) => x !== d) : [...v, d])}
                      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${on ? 'border-ember bg-ember-50 text-ember-700' : 'border-ink/10 bg-white hover:border-ink/30'}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <Field label="Short bio"><Textarea required minLength={30} maxLength={1200} value={form.bio} onChange={set('bio')} /></Field>
            <Field label="Why Sonico? What would you like to design?"><Textarea required minLength={30} maxLength={2000} value={form.motivation} onChange={set('motivation')} /></Field>
            <Field label="Relevant experience (optional)"><Textarea rows={3} maxLength={2000} value={form.experience} onChange={set('experience')} /></Field>
            <Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)}
              label={<span>I agree to the <Link to="/terms#creators" className="font-semibold text-ember">creator program terms</Link> and confirm my submissions will be my original work.</span>} />
            <FormError message={error} />
            <Button type="submit" size="lg" loading={busy} iconRight="send">Submit application</Button>
          </form>
        </Card>
      </div>
    </Container>
  );
}

export function CreatorPublicProfile() {
  const { slug = '' } = useParams();
  const creator = useQuery(async () => unwrap(await supabase.from('creator_profiles').select('*').eq('slug', slug).maybeSingle()) as CreatorProfile | null, [slug]);
  const products = useQuery(async () => creator.data
    ? (unwrap(await supabase.from('products').select(PRODUCT_LIST_COLUMNS).eq('creator_id', creator.data.id).eq('is_active', true)) as unknown as Product[])
    : [], [creator.data?.id]);

  if (creator.loading) return <PageLoader />;
  const c = creator.data;
  if (!c) return <Container className="py-20"><EmptyState icon="person_off" title="Creator not found" /></Container>;

  return (
    <Container className="py-12">
      <div className="flex flex-col items-start gap-6 rounded-4xl bg-white p-8 shadow-soft sm:flex-row sm:items-center">
        {c.avatar_url
          ? <img src={c.avatar_url} alt="" className="h-28 w-28 rounded-full object-cover" />
          : <span className="flex h-28 w-28 items-center justify-center rounded-full bg-moss font-display text-4xl font-bold text-white">{c.display_name[0]}</span>}
        <div className="flex-1">
          <Badge tone="green" icon="design_services">Sonico Creator</Badge>
          <h1 className="mt-2 font-display text-4xl font-bold">{c.display_name}</h1>
          {c.headline && <p className="mt-1 text-ink-500">{c.headline}</p>}
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-500">
            {c.location && <span className="flex items-center gap-1"><Icon name="location_on" size={18} />{c.location}</span>}
            {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 hover:text-ember"><Icon name="link" size={18} />Website</a>}
            <span className="flex items-center gap-1"><Icon name="calendar_month" size={18} />Since {date(c.created_at)}</span>
          </div>
        </div>
      </div>
      {c.bio && <p className="mt-8 max-w-3xl whitespace-pre-line leading-relaxed text-ink-700">{c.bio}</p>}
      <div className="mt-12">
        <SectionHeading title="Designs by this creator" />
        {products.loading ? <ProductGrid products={[]} loading /> : products.data?.length ? <ProductGrid products={products.data} /> : (
          <EmptyState icon="precision_manufacturing" title="First design in production" text="Products appear here once they launch." />
        )}
      </div>
    </Container>
  );
}
