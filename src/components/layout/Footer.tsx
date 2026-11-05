import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Icon } from '@/components/ui/Icon';
import { supabase } from '@/lib/supabase';

const COLUMNS = [
  { title: 'Shop', links: [['All products', '/shop'], ['New arrivals', '/shop?sort=new'], ['Headphones', '/shop/headphones'], ['Speakers', '/shop/speakers'], ['Turntables', '/shop/turntables']] },
  { title: 'Help', links: [['Help center', '/help'], ['Track order', '/account/orders'], ['Shipping', '/shipping'], ['Returns', '/returns'], ['FAQ', '/faq']] },
  { title: 'Sonico', links: [['About', '/about'], ['Creators', '/creators'], ['Join as creator', '/creators/apply'], ['Contact', '/contact']] },
] as const;

const PERKS = [
  { icon: 'local_shipping', title: 'Free shipping', text: 'On orders over ₾150' },
  { icon: 'autorenew', title: 'Easy returns', text: '30-day return policy' },
  { icon: 'verified_user', title: 'Secure payments', text: 'Encrypted checkout by Flitt' },
  { icon: 'support_agent', title: 'Real support', text: 'Humans who love audio' },
];

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState('loading');
    const { error } = await supabase.from('newsletter_subscribers').insert({ email: email.trim() });
    if (error && error.code !== '23505') { setState('error'); setMsg(error.message); return; }
    setState('done');
  };

  return (
    <section className="relative overflow-hidden rounded-4xl bg-moss px-6 py-10 text-white sm:px-12">
      <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full border-[28px] border-white/5" />
      <div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full border-[20px] border-white/5" />
      <div className="relative grid items-center gap-8 md:grid-cols-2">
        <div className="flex items-center gap-5">
          <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-moss sm:flex"><Icon name="mail" size={30} /></span>
          <div>
            <h3 className="font-display text-2xl font-bold">Stay in the loop</h3>
            <p className="mt-1 text-sm text-white/75">New drops, creator collaborations and listening guides. No spam.</p>
          </div>
        </div>
        {state === 'done' ? (
          <p className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-3.5 text-sm"><Icon name="check_circle" filled className="text-emerald-300" />You’re subscribed. Welcome to Sonico.</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-2">
            <div className="flex rounded-full bg-white p-1.5">
              <label className="sr-only" htmlFor="nl-email">Email address</label>
              <input id="nl-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address"
                className="min-w-0 flex-1 rounded-full bg-transparent px-4 text-sm text-ink placeholder:text-ink-400 focus:outline-none" />
              <button disabled={state === 'loading'} className="rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-white hover:bg-ember-600 disabled:opacity-60">
                Subscribe
              </button>
            </div>
            <p className="flex items-center gap-1 pl-4 text-xs text-white/60">
              <Icon name="shield" size={14} />{state === 'error' ? msg : 'We respect your privacy. Unsubscribe anytime.'}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-4 rounded-3xl bg-white p-6 shadow-soft md:grid-cols-4">
          {PERKS.map((p) => (
            <div key={p.title} className="flex items-center gap-3">
              <Icon name={p.icon} size={30} className="text-ember" />
              <div>
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="text-xs text-ink-500">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-12 bg-ink text-white/80">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo tone="light" />
            <p className="mt-4 max-w-xs text-sm text-white/60">
              Sound gear and listening objects, designed with independent creators and built to be loved for years.
            </p>
          </div>
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <h4 className="mb-4 text-sm font-semibold text-white">{c.title}</h4>
              <ul className="space-y-2.5 text-sm">
                {c.links.map(([label, to]) => (
                  <li key={label}><Link to={to} className="text-white/60 transition hover:text-ember">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-white/50 sm:flex-row sm:px-6">
            <span>© {new Date().getFullYear()} Sonico. All rights reserved.</span>
            <div className="flex gap-5">
              <Link to="/privacy" className="hover:text-white">Privacy</Link>
              <Link to="/terms" className="hover:text-white">Terms</Link>
              <Link to="/shipping" className="hover:text-white">Shipping</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
