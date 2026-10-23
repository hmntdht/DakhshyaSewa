'use server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { done, fail, type ActionResult } from '@/lib/errors';
import { deepMerge, isHex, nptToIso } from '@/lib/utils';
import { ICON_OPTIONS, RESOURCES, type FieldDef } from './resources';
import { SETTINGS_BY_KEY } from './settings-schema';
import { COPY_DEFAULTS } from '@/lib/i18n/copy';
import { HOME_SECTION_IDS } from '@/lib/config/types';

type SB = Awaited<ReturnType<typeof createClient>>;
const uuid = z.string().uuid();
const bad = (en: string): ActionResult => ({ ok: false, error: { en, ne: en } });

/** Every admin action starts here: verified session + role check against the database. RLS is the second lock. */
async function adminCtx(): Promise<{ sb: SB; uid: string } | null> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from('profiles').select('role,status').eq('id', user.id).maybeSingle();
  return data?.role === 'admin' && data.status === 'active' ? { sb, uid: user.id } : null;
}
async function audit(c: { sb: SB; uid: string }, action: string, entity: string, id: string | null, details?: unknown) {
  await c.sb.from('audit_logs').insert({ actor_id: c.uid, action, entity, entity_id: id, details: details ?? null });
}
const bust = (tags: string[]) => { tags.forEach((t) => revalidateTag(t)); revalidatePath('/', 'layout'); };

// ───────── field parsing shared by resources + settings ─────────
function parseField(f: FieldDef, raw: FormDataEntryValue | null, categoryIds?: Set<string>): { v: unknown } | { err: string } {
  if (f.type === 'boolean') return { v: raw === 'on' || raw === 'true' };
  let s = typeof raw === 'string' ? raw.trim() : '';
  if (f.upper) s = s.toUpperCase();
  if (s === '') return f.required ? { err: `${f.label} is required` } : { v: null };
  const lim = f.maxLength ?? (f.type === 'textarea' ? 12000 : 500);
  switch (f.type) {
    case 'number': { const n = Number(s); if (!Number.isFinite(n)) return { err: `${f.label} must be a number` }; if (f.min !== undefined && n < f.min) return { err: `${f.label} must be ≥ ${f.min}` }; if (f.max !== undefined && n > f.max) return { err: `${f.label} must be ≤ ${f.max}` }; return { v: n }; }
    case 'color': return isHex(s) ? { v: s } : { err: `${f.label} must be a #RRGGBB colour` };
    case 'slug': return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) ? { v: s } : { err: `${f.label}: lowercase letters, numbers and dashes only` };
    case 'icon': return ICON_OPTIONS.some((o) => o.value === s) ? { v: s } : { err: 'Unknown icon' };
    case 'select': return !f.options || f.options.some((o) => o.value === s) ? { v: s } : { err: `${f.label}: invalid choice` };
    case 'category': return uuid.safeParse(s).success && (!categoryIds || categoryIds.has(s)) ? { v: s } : { err: `${f.label}: unknown service` };
    case 'datetime': { const [d, t] = s.split('T'); return d && t ? { v: nptToIso(d, t.slice(0, 5)) } : { err: `${f.label}: invalid date` }; }
    case 'image': return s.startsWith(`${env.supabaseUrl}/storage/v1/object/public/public-assets/`) || s.startsWith('/brand/') ? { v: s } : { err: 'Images must be uploaded through the uploader' };
    default: return s.length > lim ? { err: `${f.label} is too long (max ${lim})` } : { v: s };
  }
}
function parseAll(fields: FieldDef[], fd: FormData, skip: (f: FieldDef) => boolean, categoryIds?: Set<string>) {
  const out: Record<string, unknown> = {}; const errs: string[] = [];
  for (const f of fields) { if (skip(f)) continue; const r = parseField(f, fd.get(f.name), categoryIds); if ('err' in r) errs.push(r.err); else out[f.name] = r.v; }
  return { out, errs };
}

// ───────── generic CMS resources ─────────
export async function saveResourceAction(key: string, id: string | null, fd: FormData): Promise<ActionResult> {
  const c = await adminCtx(); if (!c) return fail('DS_FORBIDDEN');
  const def = RESOURCES[key]; if (!def) return bad('Unknown resource');
  const editing = id !== null;
  const { data: cats } = await c.sb.from('service_categories').select('id');
  const { out, errs } = parseAll(def.fields, fd, (f) => editing && !!f.readOnlyOnEdit, new Set((cats ?? []).map((x: { id: string }) => x.id)));
  if (errs.length) return bad(errs[0]);
  if (key === 'categories' && out.parent_id && out.parent_id === id) return bad('A service cannot be its own group');
  if (key === 'contracts' && !editing) { const { data } = await c.sb.from('contract_templates').select('version').order('version', { ascending: false }).limit(1).maybeSingle(); out.version = ((data as { version: number } | null)?.version ?? 0) + 1; }
  const q = editing ? c.sb.from(def.table).update(out).eq(def.pk, id) : c.sb.from(def.table).insert(out);
  const { data: row, error } = await q.select(def.pk).maybeSingle();
  if (error) return fail(error);
  await audit(c, editing ? 'update' : 'create', def.table, (row as Record<string, string> | null)?.[def.pk] ?? id, out);
  bust(def.tags);
  return done({ en: 'Saved. The site is updated.', ne: 'सुरक्षित भयो। साइट अद्यावधिक भयो।' });
}

export async function deleteResourceAction(key: string, id: string): Promise<ActionResult> {
  const c = await adminCtx(); if (!c) return fail('DS_FORBIDDEN');
  const def = RESOURCES[key]; if (!def) return bad('Unknown resource');
  const { error } = await c.sb.from(def.table).delete().eq(def.pk, id);
  if (error) return /foreign key/i.test(error.message) ? bad('This item is used by existing bookings. Switch it off instead of deleting it.') : fail(error);
  await audit(c, 'delete', def.table, id); bust(def.tags);
  return done();
}

// ───────── settings groups ─────────
async function putSetting(c: { sb: SB; uid: string }, key: string, value: unknown): Promise<ActionResult> {
  const { error } = await c.sb.from('site_settings').upsert({ key, value, updated_by: c.uid }, { onConflict: 'key' });
  if (error) return fail(error);
  await audit(c, 'update', 'site_settings', key, value); bust(['site-config']);
  return done({ en: 'Saved. Live on the site now.', ne: 'सुरक्षित भयो। साइटमा लागू भयो।' });
}
const setPath = (o: Record<string, unknown>, path: string, v: unknown) => { const p = path.split('.'); let cur = o; p.slice(0, -1).forEach((k) => { cur = (cur[k] ??= {}) as Record<string, unknown>; }); cur[p[p.length - 1]] = v; };

export async function saveSettingsAction(group: string, fd: FormData): Promise<ActionResult> {
  const c = await adminCtx(); if (!c) return fail('DS_FORBIDDEN');
  const g = SETTINGS_BY_KEY[group]; if (!g) return bad('Unknown settings group');
  const { out, errs } = parseAll(g.fields, fd, () => false);
  if (errs.length) return bad(errs[0]);
  if (group === 'announcement' && out.link && !/^\/(?!\/)/.test(String(out.link))) return bad('Link must be a site path starting with /');
  const nested: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(out)) setPath(nested, k, v ?? (g.fields.find((f) => f.name === k)?.type === 'number' ? 0 : ''));
  const { data: cur } = await c.sb.from('site_settings').select('value').eq('key', g.storeKey).maybeSingle();
  return putSetting(c, g.storeKey, deepMerge((cur as { value: unknown } | null)?.value ?? {}, nested));
}

const hex = z.string().refine(isHex, 'Colours must be #RRGGBB');
const palette = z.object({ background: hex, surface: hex, elevated: hex, foreground: hex, muted: hex, line: hex, primary: hex, primary_foreground: hex, accent: hex, success: hex, danger: hex, warning: hex });
export async function saveThemeAction(json: string): Promise<ActionResult> {
  const c = await adminCtx(); if (!c) return fail('DS_FORBIDDEN');
  const p = z.object({ default_mode: z.enum(['dark', 'light']), radius: z.number().min(0).max(32), dark: palette, light: palette }).safeParse(safeJson(json));
  if (!p.success) return bad(p.error.issues[0]?.message ?? 'Invalid theme');
  return putSetting(c, 'theme', p.data);
}
export async function saveLayoutAction(json: string): Promise<ActionResult> {
  const c = await adminCtx(); if (!c) return fail('DS_FORBIDDEN');
  const p = z.array(z.object({ id: z.enum(HOME_SECTION_IDS as [string, ...string[]]), enabled: z.boolean() })).max(20).safeParse(safeJson(json));
  if (!p.success || new Set(p.data.map((s) => s.id)).size !== p.data.length) return bad('Invalid layout');
  return putSetting(c, 'home_layout', { sections: p.data });
}
export async function saveCopyAction(json: string): Promise<ActionResult> {
  const c = await adminCtx(); if (!c) return fail('DS_FORBIDDEN');
  const p = z.record(z.object({ en: z.string().max(500), ne: z.string().max(500) })).safeParse(safeJson(json));
  if (!p.success) return bad('Invalid copy');
  const keep = Object.fromEntries(Object.entries(p.data).filter(([k, v]) => COPY_DEFAULTS[k] && (v.en !== COPY_DEFAULTS[k].en || v.ne !== COPY_DEFAULTS[k].ne) && v.en.trim()));
  return putSetting(c, 'copy', keep);
}
function safeJson(s: string): unknown { try { return JSON.parse(s); } catch { return null; } }

// ───────── operations ─────────
export async function reviewWorkerAction(workerId: string, status: 'approved' | 'rejected' | 'suspended' | 'pending'): Promise<ActionResult> {
  const c = await adminCtx(); if (!c || !uuid.safeParse(workerId).success) return fail('DS_FORBIDDEN');
  const { error } = await c.sb.from('workers').update({ status, verified_at: status === 'approved' ? new Date().toISOString() : null }).eq('id', workerId);
  if (error) return fail(error);
  await audit(c, `worker_${status}`, 'workers', workerId); bust(['workers']); revalidatePath('/admin/workers');
  return done();
}
export async function featureWorkerAction(workerId: string, featured: boolean): Promise<ActionResult> {
  const c = await adminCtx(); if (!c || !uuid.safeParse(workerId).success) return fail('DS_FORBIDDEN');
  const { error } = await c.sb.from('workers').update({ is_featured: featured }).eq('id', workerId); if (error) return fail(error);
  await audit(c, featured ? 'worker_feature' : 'worker_unfeature', 'workers', workerId); bust(['workers']); revalidatePath('/admin/workers'); return done();
}
export async function setCommissionAction(fd: FormData): Promise<ActionResult> {
  const c = await adminCtx(); const p = z.object({ id: uuid, pct: z.string() }).safeParse(Object.fromEntries(fd));
  if (!c || !p.success) return fail('DS_FORBIDDEN');
  const n = p.data.pct.trim() === '' ? null : Number(p.data.pct); if (n !== null && (!Number.isFinite(n) || n < 0 || n > 100)) return bad('Commission must be 0–100, or empty for the default');
  const { error } = await c.sb.from('workers').update({ commission_override: n }).eq('id', p.data.id); if (error) return fail(error);
  await audit(c, 'worker_commission', 'workers', p.data.id, { n }); revalidatePath('/admin/workers'); return done({ en: 'Saved.', ne: 'सुरक्षित भयो।' });
}
export async function setUserRoleAction(userId: string, role: 'customer' | 'admin'): Promise<ActionResult> {
  const c = await adminCtx(); if (!c || !uuid.safeParse(userId).success) return fail('DS_FORBIDDEN');
  if (userId === c.uid && role !== 'admin') return bad('You cannot remove your own admin role.');
  const { error } = await c.sb.from('profiles').update({ role }).eq('id', userId); if (error) return fail(error);
  await audit(c, 'user_role', 'profiles', userId, { role }); revalidatePath('/admin/users'); return done();
}
export async function setUserStatusAction(userId: string, status: 'active' | 'suspended'): Promise<ActionResult> {
  const c = await adminCtx(); if (!c || !uuid.safeParse(userId).success) return fail('DS_FORBIDDEN');
  if (userId === c.uid) return bad('You cannot suspend yourself.');
  const { error } = await c.sb.from('profiles').update({ status }).eq('id', userId); if (error) return fail(error);
  await audit(c, 'user_status', 'profiles', userId, { status }); revalidatePath('/admin/users'); return done();
}
export async function adminBookingStatusAction(bookingId: string, to: string, reason?: string): Promise<ActionResult> {
  const c = await adminCtx(); if (!c || !uuid.safeParse(bookingId).success) return fail('DS_FORBIDDEN');
  const { error } = await c.sb.rpc('set_booking_status', { p_booking_id: bookingId, p_to: to, p_reason: reason ?? 'Admin action' });
  if (error) return fail(error);
  await audit(c, `booking_${to}`, 'bookings', bookingId, { reason }); revalidatePath('/admin', 'layout'); return done();
}
export async function adminAssignWorkerAction(bookingId: string, workerId: string): Promise<ActionResult> {
  const c = await adminCtx(); if (!c || !uuid.safeParse(bookingId).success || !uuid.safeParse(workerId).success) return fail('DS_FORBIDDEN');
  const { data: w } = await c.sb.from('workers').select('id, display_name').eq('id', workerId).eq('status', 'approved').maybeSingle();
  if (!w) return bad('Selected worker is not approved.');
  const { error } = await c.sb.from('bookings').update({ worker_id: workerId }).eq('id', bookingId);
  if (error) return fail(error);
  await audit(c, 'assign_worker', 'bookings', bookingId, { workerId, workerName: w.display_name });
  revalidatePath('/admin', 'layout'); revalidatePath('/dashboard', 'layout');
  return done({ en: `Assigned worker: ${w.display_name}`, ne: `सेवाप्रदायक तोकियो: ${w.display_name}` });
}
export async function refundBookingAction(bookingId: string): Promise<ActionResult> {
  const c = await adminCtx(); if (!c || !uuid.safeParse(bookingId).success) return fail('DS_FORBIDDEN');
  const { error: e1 } = await c.sb.from('payments').update({ status: 'refunded' }).eq('booking_id', bookingId).eq('status', 'paid');
  const { error: e2 } = await c.sb.from('bookings').update({ payment_status: 'refunded' }).eq('id', bookingId);
  if (e1 || e2) return fail(e1 ?? e2);
  await audit(c, 'refund_marked', 'bookings', bookingId, { note: 'Refund the money in the gateway dashboard / hand it back, this marks the ledger.' });
  revalidatePath('/admin', 'layout'); return done({ en: 'Marked as refunded. Remember to return the money via the gateway or in cash.', ne: 'फिर्ता भएको चिन्ह लाग्यो। गेटवे वा नगदमा रकम फिर्ता गर्न नबिर्सनुहोस्।' });
}
export async function resolveDisputeAction(fd: FormData): Promise<ActionResult> {
  const c = await adminCtx();
  const p = z.object({ id: uuid, bookingId: uuid, status: z.enum(['under_review', 'resolved', 'rejected']), resolution: z.string().trim().max(1500).optional(), refund: z.string().optional() }).safeParse(Object.fromEntries(fd));
  if (!c || !p.success) return fail('DS_FORBIDDEN');
  const closing = p.data.status !== 'under_review';
  const { error } = await c.sb.from('disputes').update({ status: p.data.status, resolution: p.data.resolution || null, resolved_by: closing ? c.uid : null, resolved_at: closing ? new Date().toISOString() : null }).eq('id', p.data.id);
  if (error) return fail(error);
  if (p.data.refund === 'on' && p.data.status === 'resolved') await refundBookingAction(p.data.bookingId);
  await audit(c, `dispute_${p.data.status}`, 'disputes', p.data.id, { refund: p.data.refund === 'on' }); revalidatePath('/admin/disputes');
  return done({ en: 'Dispute updated.', ne: 'विवाद अद्यावधिक भयो।' });
}
export async function setEnquiryStatusAction(id: string, status: 'new' | 'contacted' | 'closed'): Promise<ActionResult> {
  const c = await adminCtx(); if (!c || !uuid.safeParse(id).success) return fail('DS_FORBIDDEN');
  const { error } = await c.sb.from('enquiries').update({ status }).eq('id', id); if (error) return fail(error);
  revalidatePath('/admin/enquiries'); return done();
}
