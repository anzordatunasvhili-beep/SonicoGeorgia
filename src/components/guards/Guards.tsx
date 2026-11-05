import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/brand/Loader';

/** UI-level guards. Real enforcement is Row Level Security in the database. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, profile, loading, isAdmin } = useAuth();
  const location = useLocation();
  if (loading || (user && !profile)) return <PageLoader />;
  if (!user) return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function RequireCreator({ children }: { children: ReactNode }) {
  const { user, profile, loading, isCreator } = useAuth();
  const location = useLocation();
  if (loading || (user && !profile)) return <PageLoader />;
  if (!user) return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!isCreator) return <Navigate to="/creators" replace />;
  return <>{children}</>;
}
