'use client';
import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

const OK = ['image/jpeg', 'image/png', 'image/webp'];
/** Uploads to the public-assets bucket (admin-only by storage RLS, 3 MB, png/jpeg/webp) and posts the resulting URL with the form. */
export function ImageField({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const [url, setUrl] = useState(defaultValue ?? ''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  async function pick(f?: File) {
    if (!f) return; setErr('');
    if (!OK.includes(f.type) || f.size > 3 * 1024 * 1024) return setErr('PNG, JPEG or WebP up to 3 MB');
    setBusy(true); const sb = createClient(); const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${f.type.split('/')[1]}`;
    const { error } = await sb.storage.from('public-assets').upload(path, f, { contentType: f.type, cacheControl: '31536000' });
    if (error) setErr(error.message); else setUrl(sb.storage.from('public-assets').getPublicUrl(path).data.publicUrl);
    setBusy(false);
  }
  return (
    <div className="flex items-center gap-4"><input type="hidden" name={name} value={url} />
      {url ? <span className="relative"><img src={url} alt="" className="h-16 w-16 rounded-lg border border-line bg-elev object-contain" /><button type="button" onClick={() => setUrl('')} aria-label="Remove image" className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-bad text-bg"><X className="h-3 w-3" /></button></span> : <span className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-line text-muted"><ImagePlus className="h-5 w-5" /></span>}
      <div><label className="btn btn-outline btn-sm cursor-pointer">{busy ? 'Uploading…' : url ? 'Replace' : 'Upload'}<input type="file" accept={OK.join(',')} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} /></label>{err && <p className="mt-1 text-xs text-bad">{err}</p>}</div></div>
  );
}
