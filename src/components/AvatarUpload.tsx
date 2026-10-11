'use client';
import { useState } from 'react';
import { Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { Avatar } from './ui';
import { useT, useTs } from './providers';

const OK = ['image/jpeg', 'image/png', 'image/webp'];
/** Uploads to avatars/<uid>/… (storage RLS enforces the folder) and exposes the public URL through a hidden field. */
export function AvatarUpload({ userId, name, initial, field = 'avatar_url' }: { userId: string; name: string; initial: string; field?: string }) {
  const t = useT(); const ts = useTs(); const [url, setUrl] = useState(initial); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  async function pick(f?: File) {
    if (!f) return; setErr('');
    if (!OK.includes(f.type) || f.size > 2 * 1024 * 1024) return setErr(ts('settings.avatar_rules'));
    setBusy(true); const sb = createClient(); const path = `${userId}/avatar-${Date.now()}.${f.type.split('/')[1]}`;
    const { error } = await sb.storage.from('avatars').upload(path, f, { contentType: f.type, cacheControl: '31536000' });
    if (error) setErr(error.message); else setUrl(sb.storage.from('avatars').getPublicUrl(path).data.publicUrl);
    setBusy(false);
  }
  return (
    <div className="flex items-center gap-5"><Avatar name={name} url={url} size={72} /><input type="hidden" name={field} value={url} />
      <div><label className="btn btn-outline btn-sm cursor-pointer"><Camera className="h-4 w-4" />{busy ? '…' : t('settings.photo')}<input type="file" accept={OK.join(',')} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} /></label>{err && <p className="mt-1 text-xs text-bad">{err}</p>}</div></div>
  );
}
