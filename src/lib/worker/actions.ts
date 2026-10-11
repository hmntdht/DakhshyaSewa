'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { done, fail, type ActionResult } from '@/lib/errors';
import { rateLimit } from '@/lib/security/rate-limit';

const phone = z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/);
const time = z.string().regex(/^\d{2}:\d{2}$/);
const LANGS = ['Nepali', 'English', 'Hindi', 'Tharu', 'Doteli'];

const base = z.object({
  display_name: z.string().trim().min(2).max(60), display_name_ne: z.string().trim().max(60).optional(),
  headline_en: z.string().trim().max(120).optional(), bio_en: z.string().trim().max(1200).optional(),
  experience_years: z.coerce.number().int().min(0).max(60), work_start: time, work_end: time,
  phone, address: z.string().trim().max(300).optional(),
  services: z.string().transform((s, ctx) => { try { return z.array(z.object({ category_id: z.string().uuid(), rate: z.number().min(0).max(100000).nullable() })).min(1).max(12).parse(JSON.parse(s)); } catch { ctx.addIssue({ code: 'custom', message: 'services' }); return z.NEVER; } }),
});
const BAD: ActionResult = { ok: false, error: { en: 'Please check the form: name, phone, hours and at least one service are required.', ne: 'कृपया फारम जाँच्नुहोस्: नाम, फोन, समय र कम्तीमा एउटा सेवा आवश्यक छ।' } };

function listFrom(fd: FormData) {
  const languages = fd.getAll('languages').map(String).filter((l) => LANGS.includes(l));
  const days = fd.getAll('days').map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return { languages: languages.length ? languages : ['Nepali'], days: days.length ? days : [0, 1, 2, 3, 4, 5] };
}

export async function applyAsWorkerAction(fd: FormData): Promise<ActionResult> {
  const p = base.extend({ citizenship_no: z.string().trim().max(30).optional(), id_doc_path: z.string().min(3).max(300), selfie_path: z.string().min(3).max(300) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return BAD;
  const sb = await createClient(); const { data: { user } } = await sb.auth.getUser();
  if (!user) return fail('DS_AUTH_REQUIRED');
  if (!p.data.id_doc_path.startsWith(`${user.id}/`) || !p.data.selfie_path.startsWith(`${user.id}/`)) return fail('DS_FORBIDDEN');   // uploads must be in the applicant's own folder
  if (!(await rateLimit(`apply:${user.id}`, 3, 3600))) return fail('rate');
  const { languages, days } = listFrom(fd); const d = p.data;
  const { data: w, error } = await sb.from('workers').insert({ user_id: user.id, display_name: d.display_name, display_name_ne: d.display_name_ne || null, headline_en: d.headline_en || null, bio_en: d.bio_en || null, experience_years: d.experience_years, languages, available_days: days, work_start: d.work_start, work_end: d.work_end }).select('id').single();
  if (error) return fail(error);
  const wid = (w as { id: string }).id;
  const [a, b] = await Promise.all([
    sb.from('worker_private').insert({ worker_id: wid, phone: d.phone, citizenship_no: d.citizenship_no || null, id_doc_path: d.id_doc_path, selfie_path: d.selfie_path, address: d.address || null }),
    sb.from('worker_services').insert(d.services.map((s) => ({ worker_id: wid, category_id: s.category_id, rate: s.rate }))),
  ]);
  if (a.error || b.error) return fail(a.error ?? b.error);
  revalidatePath('/worker', 'layout');
  return done({ en: 'Application received. We will review your documents soon.', ne: 'आवेदन प्राप्त भयो। हामी छिट्टै तपाईंका कागजात जाँच्नेछौं।' });
}

export async function updateWorkerProfileAction(fd: FormData): Promise<ActionResult> {
  const p = base.extend({ is_listed: z.string().optional(), avatar_url: z.string().max(500).optional(), whatsapp: z.string().trim().max(20).optional(), payout_method: z.string().trim().max(40).optional(), payout_account: z.string().trim().max(60).optional() }).safeParse(Object.fromEntries(fd));
  if (!p.success) return BAD;
  const sb = await createClient(); const { data: { user } } = await sb.auth.getUser();
  if (!user) return fail('DS_AUTH_REQUIRED');
  const { data: w } = await sb.from('workers').select('id').eq('user_id', user.id).maybeSingle();
  if (!w) return fail('DS_NOT_FOUND');
  const { languages, days } = listFrom(fd); const d = p.data; const wid = (w as { id: string }).id;
  const okAvatar = d.avatar_url && d.avatar_url.includes(`/storage/v1/object/public/avatars/${user.id}/`);
  const { error } = await sb.from('workers').update({ display_name: d.display_name, display_name_ne: d.display_name_ne || null, headline_en: d.headline_en || null, bio_en: d.bio_en || null, experience_years: d.experience_years, languages, available_days: days, work_start: d.work_start, work_end: d.work_end, is_listed: d.is_listed === 'on', ...(okAvatar ? { avatar_url: d.avatar_url } : {}) }).eq('id', wid);
  if (error) return fail(error);
  await sb.from('worker_private').upsert({ worker_id: wid, phone: d.phone, whatsapp: d.whatsapp || null, address: d.address || null, payout_method: d.payout_method || null, payout_account: d.payout_account || null }, { onConflict: 'worker_id' });
  const keep = d.services.map((s) => s.category_id);
  const up = await sb.from('worker_services').upsert(d.services.map((s) => ({ worker_id: wid, category_id: s.category_id, rate: s.rate })), { onConflict: 'worker_id,category_id' });
  if (up.error) return fail(up.error);
  await sb.from('worker_services').delete().eq('worker_id', wid).not('category_id', 'in', `(${keep.join(',')})`);
  revalidatePath('/worker', 'layout'); revalidatePath('/', 'layout');
  return done({ en: 'Profile updated.', ne: 'प्रोफाइल अद्यावधिक भयो।' });
}
