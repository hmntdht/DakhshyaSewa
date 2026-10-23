'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { env } from '@/lib/env';
import { useT, useTs } from '../providers';
import { Field, Notice, Spinner } from '../ui';
import { sendSignupOtpAction, resendSignupOtpAction } from '@/lib/auth/actions';

type Mode = 'login' | 'signup';
const GoogleG = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" /></svg>
);

export function AuthForm({ mode, next, authError }: { mode: Mode; next: string; authError?: boolean }) {
  const t = useT(); const ts = useTs(); const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(authError ? { tone: 'error', text: ts('auth.err.callback') } : null);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingName, setPendingName] = useState('');
  const sb = env.hasSupabase ? createClient() : null;
  const origin = typeof window !== 'undefined' ? window.location.origin : env.siteUrl;
  const err = (text: string) => setMsg({ tone: 'error', text });

  async function run(fn: () => Promise<void>) {
    if (!sb) return err(ts('auth.err.config'));
    setBusy(true); setMsg(null);
    try { await fn(); } catch (e) { err((e as Error).message || ts('auth.err.generic')); } finally { setBusy(false); }
  }
  const finish = () => { router.replace(next); router.refresh(); };

  const onEmail = (fd: FormData) => run(async () => {
    const email = String(fd.get('email')).trim().toLowerCase(), password = String(fd.get('password'));
    if (mode === 'login') {
      const { error } = await sb!.auth.signInWithPassword({ email, password });
      if (error) return err(ts('auth.err.credentials'));
      return finish();
    }
    const name = String(fd.get('name')).trim();
    if (!name || name.length < 2) return err(ts('auth.err.generic'));
    if (password.length < 8) return err(ts('auth.err.short_password'));

    const res = await sendSignupOtpAction({ email, password, name });
    if (!res.ok) return err(res.error || ts('auth.err.generic'));

    setPendingEmail(email);
    setPendingName(name);
    setEmailOtpSent(true);
    setMsg({ tone: 'success', text: ts('auth.email_otp_sent') });
  });

  const verifyEmailOtp = (fd: FormData) => run(async () => {
    const token = String(fd.get('token')).trim();
    if (!token) return err(ts('auth.err.otp'));
    const { error } = await sb!.auth.verifyOtp({ email: pendingEmail, token, type: 'signup' });
    if (error) {
      const retry = await sb!.auth.verifyOtp({ email: pendingEmail, token, type: 'email' });
      if (retry.error) return err(ts('auth.err.otp'));
    }
    finish();
  });

  const resendEmailOtp = () => run(async () => {
    const res = await resendSignupOtpAction({ email: pendingEmail, name: pendingName });
    if (!res.ok) return err(res.error || ts('auth.err.generic'));
    setMsg({ tone: 'success', text: ts('auth.email_otp_sent') });
  });

  const google = () => run(async () => {
    const { error } = await sb!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    if (error) err(error.message);
  });

  const forgot = (form: HTMLFormElement | null) => run(async () => {
    const email = String(new FormData(form ?? undefined).get('email') ?? '').trim();
    if (!email) return err(ts('auth.err.email_first'));
    const { error } = await sb!.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/dashboard/settings` });
    if (error) return err(error.message);
    setMsg({ tone: 'success', text: ts('auth.reset_sent') });
  });

  return (
    <div className="card w-full max-w-md p-7 sm:p-9">
      <h1 className="text-3xl font-light tracking-tight">{t(mode === 'login' ? 'auth.login.title' : 'auth.signup.title')}</h1>
      <p className="mt-2 text-sm text-muted">{t(mode === 'login' ? 'auth.login.sub' : 'auth.signup.sub')}</p>
      {!env.hasSupabase && <Notice tone="warn" className="mt-5">{t('auth.err.config')}</Notice>}

      <button type="button" onClick={google} disabled={busy} className="btn btn-outline mt-7 w-full gap-3 py-3"><GoogleG />{t('auth.google')}</button>
      <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />{t('auth.or')}<span className="h-px flex-1 bg-line" /></div>

      {mode === 'signup' && emailOtpSent ? (
        <form action={verifyEmailOtp} className="space-y-4">
          <div className="rounded-app border border-line bg-elev/60 p-3.5 text-xs text-muted">
            {t('auth.enter_email_code')} <strong className="font-semibold text-fg">{pendingEmail}</strong>
          </div>
          <Field label={t('auth.email_code')}>
            <input
              name="token"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              className="field text-center font-mono text-xl tracking-[0.5em]"
              placeholder="••••••••"
              autoFocus
            />
          </Field>
          <button disabled={busy} className="btn btn-primary w-full py-3">
            {busy && <Spinner />}
            {t('auth.verify')}
          </button>
          <div className="flex items-center justify-between text-xs text-muted">
            <button
              type="button"
              onClick={resendEmailOtp}
              disabled={busy}
              className="hover:text-fg hover:underline"
            >
              {t('auth.resend_code')}
            </button>
            <button
              type="button"
              onClick={() => { setEmailOtpSent(false); setMsg(null); }}
              className="hover:text-fg hover:underline"
            >
              {t('auth.change_email')}
            </button>
          </div>
        </form>
      ) : (
        <form action={onEmail} className="space-y-4" id="email-form">
          {mode === 'signup' && (
            <Field label={t('auth.full_name')}>
              <input name="name" required minLength={2} maxLength={80} autoComplete="name" className="field" defaultValue={pendingName} />
            </Field>
          )}
          <Field label={t('auth.email')}>
            <input name="email" type="email" required autoComplete="email" className="field" defaultValue={pendingEmail} />
          </Field>
          <Field label={t('auth.password')} hint={mode === 'signup' ? t('auth.password_hint') : undefined}>
            <input
              name="password"
              type="password"
              required
              minLength={mode === 'signup' ? 8 : 1}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="field"
            />
          </Field>
          <button disabled={busy} className="btn btn-primary w-full py-3">
            {busy && <Spinner />}
            {t(mode === 'login' ? 'nav.login' : 'auth.signup.cta')}
          </button>
          {mode === 'login' && (
            <button
              type="button"
              className="block w-full text-center text-xs text-muted underline-offset-4 hover:text-fg hover:underline"
              onClick={(e) => forgot(e.currentTarget.form)}
            >
              {t('auth.forgot')}
            </button>
          )}
        </form>
      )}

      {msg && <Notice tone={msg.tone} className="mt-5">{msg.text}</Notice>}
      <p className="mt-7 text-center text-sm text-muted">
        {mode === 'login' ? t('auth.no_account') : t('auth.have_account')}{' '}
        <Link href={`${mode === 'login' ? '/signup' : '/login'}?next=${encodeURIComponent(next)}`} className="font-medium text-primary underline-offset-4 hover:underline">
          {t(mode === 'login' ? 'nav.signup' : 'nav.login')}
        </Link>
      </p>
    </div>
  );
}
