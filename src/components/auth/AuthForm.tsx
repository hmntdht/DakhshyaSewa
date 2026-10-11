'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Mail, Smartphone } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { env } from '@/lib/env';
import { useT, useTs } from '../providers';
import { Field, Notice, Spinner } from '../ui';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'signup';
const GoogleG = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" /></svg>
);

/** Normalise a Nepali mobile number to E.164. Accepts 98XXXXXXXX, 9779XXXXXXXXX, +977 98... */
function toE164(raw: string) {
  const d = raw.replace(/\D/g, '').replace(/^977/, '');
  return /^9[78]\d{8}$/.test(d) ? `+977${d}` : null;
}

export function AuthForm({ mode, next, authError }: { mode: Mode; next: string; authError?: boolean }) {
  const t = useT(); const ts = useTs(); const router = useRouter();
  const [tab, setTab] = useState<'email' | 'phone'>('email');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(authError ? { tone: 'error', text: ts('auth.err.callback') } : null);
  const [otpSent, setOtpSent] = useState(false);
  const [phone, setPhone] = useState('');
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
    const email = String(fd.get('email')).trim(), password = String(fd.get('password'));
    if (mode === 'login') {
      const { error } = await sb!.auth.signInWithPassword({ email, password });
      if (error) return err(ts('auth.err.credentials'));
      return finish();
    }
    if (password.length < 8) return err(ts('auth.err.short_password'));
    const { data, error } = await sb!.auth.signUp({ email, password, options: { data: { full_name: String(fd.get('name')).trim() }, emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    if (error) return err(error.message);
    if (data.session) return finish();
    setMsg({ tone: 'success', text: ts('auth.check_email') });
  });

  const sendOtp = () => run(async () => {
    const e164 = toE164(phone);
    if (!e164) return err(ts('auth.err.phone'));
    const { error } = await sb!.auth.signInWithOtp({ phone: e164, options: { shouldCreateUser: true } });
    if (error) return err(error.message);
    setOtpSent(true); setMsg({ tone: 'success', text: ts('auth.otp_sent') });
  });
  const verifyOtp = (fd: FormData) => run(async () => {
    const e164 = toE164(phone);
    const { error } = await sb!.auth.verifyOtp({ phone: e164 ?? '', token: String(fd.get('token')).trim(), type: 'sms' });
    if (error) return err(ts('auth.err.otp'));
    finish();
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

  const tabBtn = (k: 'email' | 'phone', icon: React.ReactNode, label: string) => (
    <button type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setMsg(null); }}
      className={cn('flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition', tab === k ? 'bg-fg text-bg' : 'text-muted hover:text-fg')}>{icon}{label}</button>
  );

  return (
    <div className="card w-full max-w-md p-7 sm:p-9">
      <h1 className="text-3xl font-light tracking-tight">{t(mode === 'login' ? 'auth.login.title' : 'auth.signup.title')}</h1>
      <p className="mt-2 text-sm text-muted">{t(mode === 'login' ? 'auth.login.sub' : 'auth.signup.sub')}</p>
      {!env.hasSupabase && <Notice tone="warn" className="mt-5">{t('auth.err.config')}</Notice>}

      <button type="button" onClick={google} disabled={busy} className="btn btn-outline mt-7 w-full gap-3 py-3"><GoogleG />{t('auth.google')}</button>
      <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />{t('auth.or')}<span className="h-px flex-1 bg-line" /></div>

      <div role="tablist" className="mb-6 flex rounded-full border border-line p-0.5">
        {tabBtn('email', <Mail className="h-4 w-4" />, ts('auth.email'))}
        {tabBtn('phone', <Smartphone className="h-4 w-4" />, ts('auth.phone'))}
      </div>

      {tab === 'email' ? (
        <form action={onEmail} className="space-y-4" id="email-form">
          {mode === 'signup' && <Field label={t('auth.full_name')}><input name="name" required minLength={2} maxLength={80} autoComplete="name" className="field" /></Field>}
          <Field label={t('auth.email')}><input name="email" type="email" required autoComplete="email" className="field" /></Field>
          <Field label={t('auth.password')} hint={mode === 'signup' ? t('auth.password_hint') : undefined}>
            <input name="password" type="password" required minLength={mode === 'signup' ? 8 : 1} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="field" />
          </Field>
          <button disabled={busy} className="btn btn-primary w-full py-3">{busy && <Spinner />}{t(mode === 'login' ? 'nav.login' : 'auth.signup.cta')}</button>
          {mode === 'login' && <button type="button" className="block w-full text-center text-xs text-muted underline-offset-4 hover:text-fg hover:underline" onClick={(e) => forgot(e.currentTarget.form)}>{t('auth.forgot')}</button>}
        </form>
      ) : !otpSent ? (
        <div className="space-y-4">
          <Field label={t('auth.phone')} hint={t('auth.phone_hint')}>
            <div className="flex"><span className="grid place-items-center rounded-l-app border border-r-0 border-line bg-elev px-3 text-sm text-muted">+977</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel-national" placeholder="98XXXXXXXX" className="field !rounded-l-none" /></div>
          </Field>
          <button type="button" onClick={sendOtp} disabled={busy} className="btn btn-primary w-full py-3">{busy && <Spinner />}{t('auth.send_otp')}</button>
        </div>
      ) : (
        <form action={verifyOtp} className="space-y-4">
          <Field label={t('auth.code')}><input name="token" required inputMode="numeric" autoComplete="one-time-code" maxLength={8} className="field text-center font-mono text-xl tracking-[0.5em]" /></Field>
          <button disabled={busy} className="btn btn-primary w-full py-3">{busy && <Spinner />}{t('auth.verify')}</button>
          <button type="button" onClick={() => { setOtpSent(false); setMsg(null); }} className="block w-full text-center text-xs text-muted hover:text-fg">{t('auth.change_number')}</button>
        </form>
      )}

      {msg && <Notice tone={msg.tone} className="mt-5">{msg.text}</Notice>}
      <p className="mt-7 text-center text-sm text-muted">
        {mode === 'login' ? t('auth.no_account') : t('auth.have_account')}{' '}
        <Link href={`${mode === 'login' ? '/signup' : '/login'}?next=${encodeURIComponent(next)}`} className="font-medium text-primary underline-offset-4 hover:underline">{t(mode === 'login' ? 'nav.signup' : 'nav.login')}</Link>
      </p>
    </div>
  );
}
