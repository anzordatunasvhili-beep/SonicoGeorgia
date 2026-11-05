import { lazy } from 'react';
import { createBrowserRouter, Outlet, RouterProvider, useRouteError } from 'react-router-dom';
import { ScrollToTop, SiteLayout } from '@/components/layout/Layout';
import { RequireAdmin, RequireAuth, RequireCreator } from '@/components/guards/Guards';
import { supabaseConfigured } from '@/lib/supabase';
import Home from '@/pages/Home';

// Route-level code splitting: each area loads on demand.
const Shop = lazy(() => import('@/pages/shop/Shop'));
const ProductDetail = lazy(() => import('@/pages/shop/ProductDetail'));
const Cart = lazy(() => import('@/pages/shop/Cart'));
const Checkout = lazy(() => import('@/pages/shop/Checkout'));
const Payment = lazy(() => import('@/pages/shop/Payment'));

const auth = () => import('@/pages/auth/AuthPages');
const SignIn = lazy(() => auth().then((m) => ({ default: m.SignIn })));
const SignUp = lazy(() => auth().then((m) => ({ default: m.SignUp })));
const ForgotPassword = lazy(() => auth().then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => auth().then((m) => ({ default: m.ResetPassword })));

const acc = () => import('@/pages/account/Account');
const AccountLayout = lazy(() => acc().then((m) => ({ default: m.AccountLayout })));
const AccountOverview = lazy(() => acc().then((m) => ({ default: m.AccountOverview })));
const AccountOrders = lazy(() => acc().then((m) => ({ default: m.AccountOrders })));
const AccountOrderDetail = lazy(() => acc().then((m) => ({ default: m.AccountOrderDetail })));
const AccountSettings = lazy(() => acc().then((m) => ({ default: m.AccountSettings })));
const AccountCreator = lazy(() => acc().then((m) => ({ default: m.AccountCreator })));

const cp = () => import('@/pages/creators/CreatorsPublic');
const CreatorsLanding = lazy(() => cp().then((m) => ({ default: m.CreatorsLanding })));
const CreatorApply = lazy(() => cp().then((m) => ({ default: m.CreatorApply })));
const CreatorPublicProfile = lazy(() => cp().then((m) => ({ default: m.CreatorPublicProfile })));

const cs = () => import('@/pages/creators/CreatorStudio');
const CreatorLayout = lazy(() => cs().then((m) => ({ default: m.CreatorLayout })));
const CreatorOverview = lazy(() => cs().then((m) => ({ default: m.CreatorOverview })));
const CreatorSubmissions = lazy(() => cs().then((m) => ({ default: m.CreatorSubmissions })));
const SubmissionEditor = lazy(() => cs().then((m) => ({ default: m.SubmissionEditor })));
const SubmissionDetail = lazy(() => cs().then((m) => ({ default: m.SubmissionDetail })));
const CreatorAgreements = lazy(() => cs().then((m) => ({ default: m.CreatorAgreements })));
const CreatorEarnings = lazy(() => cs().then((m) => ({ default: m.CreatorEarnings })));
const CreatorProfileSettings = lazy(() => cs().then((m) => ({ default: m.CreatorProfileSettings })));

const ac = () => import('@/pages/admin/AdminCatalog');
const AdminLayout = lazy(() => ac().then((m) => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => ac().then((m) => ({ default: m.AdminDashboard })));
const AdminProducts = lazy(() => ac().then((m) => ({ default: m.AdminProducts })));
const AdminProductEditor = lazy(() => ac().then((m) => ({ default: m.AdminProductEditor })));
const AdminCategories = lazy(() => ac().then((m) => ({ default: m.AdminCategories })));
const AdminInventory = lazy(() => ac().then((m) => ({ default: m.AdminInventory })));
const ao = () => import('@/pages/admin/AdminOps');
const AdminOrders = lazy(() => ao().then((m) => ({ default: m.AdminOrders })));
const AdminOrderDetail = lazy(() => ao().then((m) => ({ default: m.AdminOrderDetail })));
const AdminUsers = lazy(() => ao().then((m) => ({ default: m.AdminUsers })));
const AdminMessages = lazy(() => ao().then((m) => ({ default: m.AdminMessages })));
const acr = () => import('@/pages/admin/AdminCreators');
const AdminApplications = lazy(() => acr().then((m) => ({ default: m.AdminApplications })));
const AdminCreatorsList = lazy(() => acr().then((m) => ({ default: m.AdminCreatorsList })));
const AdminSubmissions = lazy(() => acr().then((m) => ({ default: m.AdminSubmissions })));
const AdminSubmissionDetail = lazy(() => acr().then((m) => ({ default: m.AdminSubmissionDetail })));
const AdminEarnings = lazy(() => acr().then((m) => ({ default: m.AdminEarnings })));

const info = () => import('@/pages/info/InfoPages');
const About = lazy(() => info().then((m) => ({ default: m.About })));
const Contact = lazy(() => info().then((m) => ({ default: m.Contact })));
const Help = lazy(() => info().then((m) => ({ default: m.Help })));
const FAQ = lazy(() => info().then((m) => ({ default: m.FAQ })));
const Shipping = lazy(() => info().then((m) => ({ default: m.Shipping })));
const Returns = lazy(() => info().then((m) => ({ default: m.Returns })));
const Privacy = lazy(() => info().then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => info().then((m) => ({ default: m.Terms })));
const NotFound = lazy(() => info().then((m) => ({ default: m.NotFound })));

function Root() {
  return (
    <>
      <ScrollToTop />
      {!supabaseConfigured && (
        <div className="bg-red-600 px-4 py-2 text-center text-sm text-white">
          Supabase is not configured. Copy <code>.env.example</code> to <code>.env</code> and set your project URL and anon key.
        </div>
      )}
      <Outlet />
    </>
  );
}

function RouteError() {
  const error = useRouteError();
  console.error(error);
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper-50 px-6 text-center">
      <p className="font-display text-6xl font-bold text-ink/10">Oops</p>
      <h1 className="font-display text-2xl font-bold text-ink">This page hit a wrong note</h1>
      <p className="max-w-md text-sm text-ink-500">{message}</p>
      <div className="flex gap-3">
        <button onClick={() => window.location.reload()} className="rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-white">Try again</button>
        <a href="/" className="rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-semibold text-ink">Home</a>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      {
        element: <SiteLayout />,
        children: [
          { index: true, element: <Home /> },
          { path: 'shop', element: <Shop /> },
          { path: 'shop/:category', element: <Shop /> },
          { path: 'product/:slug', element: <ProductDetail /> },
          { path: 'cart', element: <Cart /> },
          { path: 'checkout', element: <RequireAuth><Checkout /></RequireAuth> },
          { path: 'checkout/pay/:orderId', element: <RequireAuth><Payment /></RequireAuth> },

          { path: 'signin', element: <SignIn /> },
          { path: 'signup', element: <SignUp /> },
          { path: 'forgot-password', element: <ForgotPassword /> },
          { path: 'reset-password', element: <ResetPassword /> },

          {
            path: 'account',
            element: <RequireAuth><AccountLayout /></RequireAuth>,
            children: [
              { index: true, element: <AccountOverview /> },
              { path: 'orders', element: <AccountOrders /> },
              { path: 'orders/:id', element: <AccountOrderDetail /> },
              { path: 'settings', element: <AccountSettings /> },
              { path: 'creator', element: <AccountCreator /> },
            ],
          },

          { path: 'creators', element: <CreatorsLanding /> },
          { path: 'creators/apply', element: <RequireAuth><CreatorApply /></RequireAuth> },
          { path: 'creators/:slug', element: <CreatorPublicProfile /> },
          {
            path: 'creator',
            element: <RequireCreator><CreatorLayout /></RequireCreator>,
            children: [
              { index: true, element: <CreatorOverview /> },
              { path: 'submissions', element: <CreatorSubmissions /> },
              { path: 'submissions/new', element: <SubmissionEditor /> },
              { path: 'submissions/:id', element: <SubmissionDetail /> },
              { path: 'submissions/:id/edit', element: <SubmissionEditor /> },
              { path: 'agreements', element: <CreatorAgreements /> },
              { path: 'earnings', element: <CreatorEarnings /> },
              { path: 'profile', element: <CreatorProfileSettings /> },
            ],
          },

          {
            path: 'admin',
            element: <RequireAdmin><AdminLayout /></RequireAdmin>,
            children: [
              { index: true, element: <AdminDashboard /> },
              { path: 'orders', element: <AdminOrders /> },
              { path: 'orders/:id', element: <AdminOrderDetail /> },
              { path: 'products', element: <AdminProducts /> },
              { path: 'products/new', element: <AdminProductEditor /> },
              { path: 'products/:id', element: <AdminProductEditor /> },
              { path: 'categories', element: <AdminCategories /> },
              { path: 'inventory', element: <AdminInventory /> },
              { path: 'users', element: <AdminUsers /> },
              { path: 'applications', element: <AdminApplications /> },
              { path: 'creators', element: <AdminCreatorsList /> },
              { path: 'submissions', element: <AdminSubmissions /> },
              { path: 'submissions/:id', element: <AdminSubmissionDetail /> },
              { path: 'earnings', element: <AdminEarnings /> },
              { path: 'messages', element: <AdminMessages /> },
            ],
          },

          { path: 'about', element: <About /> },
          { path: 'contact', element: <Contact /> },
          { path: 'help', element: <Help /> },
          { path: 'faq', element: <FAQ /> },
          { path: 'shipping', element: <Shipping /> },
          { path: 'returns', element: <Returns /> },
          { path: 'privacy', element: <Privacy /> },
          { path: 'terms', element: <Terms /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
