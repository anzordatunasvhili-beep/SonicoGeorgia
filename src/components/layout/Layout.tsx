import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnnouncementBar, Header } from './Header';
import { Footer } from './Footer';
import { CartDrawer } from './CartDrawer';
import { PageLoader } from '@/components/brand/Loader';

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

export function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}

export function Container({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function PageHeader({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) {
  return (
    <div className="border-b border-ink/5 bg-gradient-to-b from-white to-paper-50">
      <Container className="py-12 sm:py-16">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-ember">{eyebrow}</p>}
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">{title}</h1>
        {text && <p className="mt-3 max-w-2xl text-ink-500">{text}</p>}
      </Container>
    </div>
  );
}
