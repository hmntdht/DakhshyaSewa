'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { applyAsWorkerAction } from '@/lib/worker/actions';
import { ProfileFields } from './ProfileFields';
import { ServicePicker } from './ServicePicker';
import { LeafletAreaPicker } from '../map';
import type { ServiceCircle } from '../map';
import { Bi } from '../Bi';
import { useT, useTs } from '../providers';
import { Field, Notice, Spinner } from '../ui';
import type { Category } from '@/types/db';
import type { Msg } from '@/lib/config/types';

const OK = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function ApplyForm({ userId, categories, phone, name }: { userId: string; categories: Category[]; phone: string; name: string }) {
  const t = useT(); const ts = useTs(); const router = useRouter();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<Msg | null>(null);
  // Pre-fill with Attariya, Kailali defaults so the circle is visible immediately
  const [area, setArea] = useState<ServiceCircle>({ lat: 28.7833, lng: 80.5167, radiusKm: 5 });

  async function submit(fd: FormData) {
    setErr(null); setBusy(true);
    try {
      const sb = createClient();
      const up = async (field: string, label: string) => {
        const f = fd.get(field) as File | null;
        if (!f || !f.size) throw new Error(ts('apply.err.files'));
        if (!OK.includes(f.type) || f.size > 5 * 1024 * 1024) throw new Error(ts('apply.err.file_rules'));
        const path = `${userId}/${label}-${Date.now()}.${f.type === 'application/pdf' ? 'pdf' : f.type.split('/')[1]}`;
        const { error } = await sb.storage.from('worker-docs').upload(path, f, { contentType: f.type, upsert: false });
        if (error) throw new Error(error.message);
        return path;
      };
      const [idPath, selfiePath] = [await up('id_file', 'id'), await up('selfie_file', 'selfie')];
      fd.delete('id_file'); fd.delete('selfie_file'); fd.set('id_doc_path', idPath); fd.set('selfie_path', selfiePath);
      // Always attach area (defaults to Attariya 5 km if not changed)
      fd.set('area_lat', String(area.lat));
      fd.set('area_lng', String(area.lng));
      fd.set('area_radius_km', String(area.radiusKm));
      const r = await applyAsWorkerAction(fd);
      if (!r.ok) { setErr(r.error); return; }
      router.push('/worker'); router.refresh();
    } catch (e) { setErr({ en: (e as Error).message, ne: (e as Error).message }); } finally { setBusy(false); }
  }

  return (
    <form action={submit} className="space-y-12">
      <section><h2 className="mb-5 text-2xl font-light tracking-tight">{t('apply.s1')}</h2><ProfileFields d={{ display_name: name, phone }} /></section>
      <section><h2 className="mb-2 text-2xl font-light tracking-tight">{t('apply.s2')}</h2><p className="mb-5 text-sm text-muted">{t('apply.s2_sub')}</p><ServicePicker categories={categories} /></section>

      {/* ── Service area picker ── */}
      <section>
        <h2 className="mb-2 text-2xl font-light tracking-tight">Your service area</h2>
        <p className="mb-5 text-sm text-muted">
          Draw a circle on the map showing where you are willing to travel. You can adjust the radius using the slider or ±&nbsp;buttons.
          Tap / click anywhere on the map to move the center, or drag the center dot.
        </p>
        <LeafletAreaPicker
          value={area}
          onChange={setArea}
          height={400}
          minKm={1}
          maxKm={50}
        />
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-light tracking-tight">{t('apply.s3')}</h2><p className="mb-5 text-sm text-muted">{t('apply.s3_sub')}</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('apply.citizenship')} className="sm:col-span-2"><input name="citizenship_no" maxLength={30} className="field" /></Field>
          <Field label={t('apply.id_file')}><input name="id_file" type="file" accept={OK.join(',')} required className="field file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary-fg" /></Field>
          <Field label={t('apply.selfie')}><input name="selfie_file" type="file" accept="image/*" capture="user" required className="field file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary-fg" /></Field>
        </div>
      </section>
      {err && <Notice tone="error"><Bi v={err} /></Notice>}
      <button type="submit" disabled={busy} className="btn btn-primary btn-lg">{busy && <Spinner />}{t('apply.submit')}</button>
    </form>
  );
}

