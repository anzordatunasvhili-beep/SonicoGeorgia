import { NavLink, Outlet } from 'react-router-dom';
import { Suspense, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { PageLoader } from '@/components/brand/Loader';
import { Container } from './Layout';

export interface ShellLink { to: string; label: string; icon: string; end?: boolean; badge?: number }

/** Sidebar + content shell shared by the account, creator and admin areas. */
export function DashboardShell({ title, subtitle, links, accent = 'ember', header }: {
  title: string; subtitle?: string; links: ShellLink[]; accent?: 'ember' | 'moss' | 'ink'; header?: ReactNode;
}) {
  const active = accent === 'moss' ? 'bg-moss text-white' : accent === 'ink' ? 'bg-ink text-white' : 'bg-ember text-white';
  return (
    <Container className="py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
        </div>
        {header}
      </div>
      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0" aria-label={`${title} navigation`}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}
              className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${isActive ? active : 'text-ink-700 hover:bg-white'}`}>
              <Icon name={l.icon} size={20} />
              <span className="flex-1">{l.label}</span>
              {!!l.badge && <span className="rounded-full bg-ember-50 px-2 text-xs font-bold text-ember-700">{l.badge}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0">
          <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
        </div>
      </div>
    </Container>
  );
}

/** Simple responsive table wrapper. */
export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-ink/5 bg-white shadow-soft">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-ink/5 text-xs uppercase tracking-wider text-ink-400">
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-ink/5">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}
