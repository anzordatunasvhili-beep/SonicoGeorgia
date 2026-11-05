import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Logo } from '@/components/brand/Logo';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

const NAV = [
  { to: '/shop', label: 'Shop' },
  { to: '/shop?sort=new', label: 'New Arrivals' },
  { to: '/shop/headphones', label: 'Headphones' },
  { to: '/shop/speakers', label: 'Speakers' },
  { to: '/shop/turntables', label: 'Vinyl' },
  { to: '/creators', label: 'Creators' },
];

export function AnnouncementBar() {
  return (
    <div className="bg-ink text-xs text-white/85">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center gap-6 px-4 sm:gap-10">
        <span className="flex items-center gap-1.5"><Icon name="local_shipping" size={16} className="text-ember" />Free shipping over ₾150</span>
        <span className="hidden items-center gap-1.5 sm:flex"><Icon name="autorenew" size={16} className="text-ember" />30-day returns</span>
        <span className="hidden items-center gap-1.5 md:flex"><Icon name="lock" size={16} className="text-ember" />Secure payments by Flitt</span>
      </div>
    </div>
  );
}

export function Header() {
  const { user, profile, isAdmin, isCreator } = useAuth();
  const { count, setOpen } = useCart();
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMenu(false);
  }, [location.pathname, location.search]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop');
  };

  return (
    <header className={`sticky top-0 z-50 transition-all ${scrolled ? 'bg-paper-50/85 shadow-soft backdrop-blur-xl' : 'bg-paper-50'}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:h-[72px] sm:px-6">
        <IconButton icon="menu" label="Open menu" className="lg:hidden" onClick={() => setMenu(true)} />
        <Logo animated />

        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <NavLink
              key={n.label}
              to={n.to}
              end={n.to === '/shop'}
              className={({ isActive }) =>
                `rounded-full px-3 py-2 text-sm font-medium transition ${isActive && !n.to.includes('?') ? 'text-ember' : 'text-ink-700 hover:text-ink'}`}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <form onSubmit={submit} className="ml-auto hidden max-w-xs flex-1 md:block" role="search">
          <label className="relative block">
            <span className="sr-only">Search products</span>
            <Icon name="search" size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sound gear…"
              className="h-10 w-full rounded-full border border-ink/10 bg-white pl-11 pr-4 text-sm focus:border-ember focus:outline-none focus:ring-4 focus:ring-ember/15"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          {isAdmin && (
            <Link to="/admin" className="hidden items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white sm:inline-flex">
              <Icon name="admin_panel_settings" size={16} />Admin
            </Link>
          )}
          {isCreator && (
            <Link to="/creator" className="hidden items-center gap-1 rounded-full bg-moss px-3 py-1.5 text-xs font-semibold text-white sm:inline-flex">
              <Icon name="design_services" size={16} />Studio
            </Link>
          )}
          <Link
            to={user ? '/account' : '/signin'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-ink/5"
            aria-label={user ? 'Your account' : 'Sign in'}
            title={profile?.full_name ?? (user ? 'Account' : 'Sign in')}
          >
            <Icon name={user ? 'account_circle' : 'person'} filled={!!user} />
          </Link>
          <IconButton icon="shopping_bag" label="Open cart" badge={count} onClick={() => setOpen(true)} />
        </div>
      </div>

      <AnimatePresence>
        {menu && (
          <motion.div className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(false)}>
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="flex h-full w-[min(86vw,340px)] flex-col gap-6 bg-paper-50 p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <Logo />
                <IconButton icon="close" label="Close menu" onClick={() => setMenu(false)} />
              </div>
              <form onSubmit={submit} role="search">
                <label className="relative block">
                  <span className="sr-only">Search products</span>
                  <Icon name="search" size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sound gear…"
                    className="h-11 w-full rounded-full border border-ink/10 bg-white pl-11 pr-4 text-sm focus:border-ember focus:outline-none" />
                </label>
              </form>
              <nav className="flex flex-col" aria-label="Mobile">
                {NAV.map((n) => (
                  <Link key={n.label} to={n.to} className="flex items-center justify-between border-b border-ink/5 py-3.5 font-medium text-ink">
                    {n.label}<Icon name="chevron_right" className="text-ink-400" />
                  </Link>
                ))}
                {isCreator && <Link to="/creator" className="py-3.5 font-medium text-moss">Creator studio</Link>}
                {isAdmin && <Link to="/admin" className="py-3.5 font-medium text-ember">Admin dashboard</Link>}
              </nav>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
