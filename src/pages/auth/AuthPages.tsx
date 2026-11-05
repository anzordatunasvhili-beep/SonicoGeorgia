import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Field, FormError, Input } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

/** Only allow same-site relative redirects. */
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/account';
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-110px)] max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-2">
      <div className="relative hidden h-full min-h-[520px] overflow-hidden rounded-4xl bg-ink p-10 text-white lg:flex lg:flex-col">
        <Logo tone="light" animated />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-[420px] w-[420px] rounded-full" style={{ background: 'repeating-radial-gradient(circle, #1f1f22 0 3px, #151517 3px 6px)' }} />
        <div className="pointer-events-none absolute bottom-[86px] right-[86px] flex h-24 w-24 items-center justify-center rounded-full bg-ember text-white">
          <LogoMark animated size={40} />
        </div>
        <p className="relative mt-auto max-w-xs font-display text-3xl font-bold leading-tight">Every beat. Every detail. Every listener.</p>
      </div>
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-ink-500">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export function SignIn() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(err.message);
    else navigate(next, { replace: true });
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to track orders, manage your account and creator studio.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><Input icon="mail" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><Input icon="lock" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <div className="text-right"><Link to="/forgot-password" className="text-sm font-medium text-ember hover:underline">Forgot password?</Link></div>
        <FormError message={error} />
        <Button type="submit" size="lg" className="w-full" loading={busy}>Sign in</Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">New to Sonico? <Link to={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-ink hover:text-ember">Create an account</Link></p>
    </AuthShell>
  );
}

export function SignUp() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}${next}` },
    });
    setBusy(false);
    if (err) setError(err.message);
    else if (!data.session) setSent(true); // email confirmation enabled
  };

  if (sent) {
    return (
      <AuthShell title="Check your inbox" subtitle={`We sent a confirmation link to ${email}.`}>
        <div className="flex items-start gap-3 rounded-2xl bg-white p-5 shadow-soft">
          <Icon name="mark_email_read" className="text-ember" size={28} />
          <p className="text-sm text-ink-500">Open the link to activate your account. You can close this tab.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" subtitle="Faster checkout, order tracking, and access to the creator program.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name"><Input icon="person" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email"><Input icon="mail" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password" hint="At least 8 characters."><Input icon="lock" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <FormError message={error} />
        <Button type="submit" size="lg" className="w-full" loading={busy}>Create account</Button>
        <p className="text-center text-xs text-ink-400">By creating an account you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.</p>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">Already have an account? <Link to={`/signin?next=${encodeURIComponent(next)}`} className="font-semibold text-ink hover:text-ember">Sign in</Link></p>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (err) setError(err.message);
    else setSent(true);
  };

  return (
    <AuthShell title="Reset password" subtitle="We’ll email you a secure link to choose a new password.">
      {sent ? (
        <p className="flex items-center gap-2 rounded-2xl bg-white p-5 text-sm shadow-soft"><Icon name="mark_email_read" className="text-ember" />If an account exists for {email}, a reset link is on its way.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email"><Input icon="mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <FormError message={error} />
          <Button type="submit" size="lg" className="w-full" loading={busy}>Send reset link</Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => { if (!loading) setReady(true); }, [loading]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) setError(err.message);
    else navigate('/account', { replace: true });
  };

  return (
    <AuthShell title="Choose a new password" subtitle="Your new password takes effect immediately.">
      {ready && !session ? (
        <FormError message="This reset link is invalid or has expired. Request a new one." />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="New password"><Input icon="lock" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <FormError message={error} />
          <Button type="submit" size="lg" className="w-full" loading={busy}>Update password</Button>
        </form>
      )}
    </AuthShell>
  );
}
