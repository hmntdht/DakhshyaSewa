'use client';
import { useState } from 'react';
import { Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { updateProfileAction } from '@/lib/account/actions';
import { ActionForm, SubmitButton } from '../form';
import { Avatar, Field, Notice } from '../ui';
import { useT, useTs } from '../providers';
import { Bi } from '../Bi';

const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ProfileForm({ userId, name, phone, avatar, email }: { userId: string; name: string; phone: string; avatar: string; email: string }) {
  const t = useT(); const ts = useTs();
  const [url, setUrl] = useState(avatar); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  async function upload(file: File | undefined) {
    if (!file) return; setErr('');
    if (!OK_TYPES.includes(file.type) || file.size > 2 * 1024 * 1024) return setErr(ts('settings.avatar_rules'));
    setBusy(true);
    const sb = createClient(); const path = `${userId}/avatar-${Date.now()}.${file.type.split('/')[1]}`;
    const { error } = await sb.storage.from('avatars').upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
    if (error) setErr(error.message); else setUrl(sb.storage.from('avatars').getPublicUrl(path).data.publicUrl);
    setBusy(false);
  }
  return (
    <ActionForm action={updateProfileAction} className="card space-y-5 p-6">
      <div className="flex items-center gap-5">
        <Avatar name={name} url={url} size={72} />
        <label className="btn btn-outline btn-sm cursor-pointer"><Camera className="h-4 w-4" />{busy ? '…' : t('settings.photo')}<input type="file" accept={OK_TYPES.join(',')} className="sr-only" onChange={(e) => upload(e.target.files?.[0])} /></label>
      </div>
      {err && <Notice tone="error">{err}</Notice>}
      <input type="hidden" name="avatar_url" value={url} />
      <Field label={t('auth.full_name')}><input name="full_name" required minLength={2} maxLength={80} defaultValue={name} className="field" /></Field>
      <Field label={t('auth.phone')}><input name="phone" inputMode="tel" defaultValue={phone} className="field" /></Field>
      <Field label={t('auth.email')}><input value={email} readOnly disabled className="field" /></Field>
      <SubmitButton>{t('common.save')}</SubmitButton>
    </ActionForm>
  );
}

export function PasswordForm() {
  const t = useT(); const ts = useTs();
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null); const [busy, setBusy] = useState(false);
  async function save(fd: FormData) {
    const pw = String(fd.get('password')); setMsg(null);
    if (pw.length < 8) return setMsg({ tone: 'error', text: ts('auth.err.short_password') });
    if (pw !== String(fd.get('confirm'))) return setMsg({ tone: 'error', text: ts('settings.pw_mismatch') });
    setBusy(true); const { error } = await createClient().auth.updateUser({ password: pw }); setBusy(false);
    setMsg(error ? { tone: 'error', text: error.message } : { tone: 'success', text: ts('settings.pw_saved') });
  }
  return (
    <form action={save} className="card space-y-5 p-6">
      <h2 className="text-lg font-medium"><Bi en="Password" ne="पासवर्ड" /></h2>
      <Field label={t('settings.pw_new')}><input name="password" type="password" minLength={8} required autoComplete="new-password" className="field" /></Field>
      <Field label={t('settings.pw_confirm')}><input name="confirm" type="password" minLength={8} required autoComplete="new-password" className="field" /></Field>
      <button disabled={busy} className="btn btn-primary">{t('common.save')}</button>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </form>
  );
}
