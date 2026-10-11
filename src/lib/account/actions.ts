'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { done, fail, type ActionResult } from '@/lib/errors';
import { digitsOnly, maskPhone } from '@/lib/utils';

const uuid = z.string().uuid();
const phone = z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/);

async function me() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  return { sb, user };
}

export async function updateProfileAction(fd: FormData): Promise<ActionResult> {
  const p = z.object({ full_name: z.string().trim().min(2).max(80), phone: phone.optional().or(z.literal('')), avatar_url: z.string().max(500).optional() }).safeParse(Object.fromEntries(fd));
  if (!p.success) return fail('DS_BAD_ADDRESS');
  const { sb, user } = await me(); if (!user) return fail('DS_AUTH_REQUIRED');
  // only accept avatars that live in OUR avatars bucket, under THIS user's folder
  const okAvatar = p.data.avatar_url && p.data.avatar_url.startsWith(`${env.supabaseUrl}/storage/v1/object/public/avatars/${user.id}/`);
  const { error } = await sb.from('profiles').update({ full_name: p.data.full_name, phone: p.data.phone || null, ...(okAvatar ? { avatar_url: p.data.avatar_url } : {}) }).eq('id', user.id);
  if (error) return fail(error);
  revalidatePath('/dashboard', 'layout');
  return done({ en: 'Profile saved.', ne: 'प्रोफाइल सुरक्षित भयो।' });
}

export async function addAddressAction(fd: FormData): Promise<ActionResult> {
  const p = z.object({ label: z.string().trim().min(1).max(40), address_text: z.string().trim().min(3).max(300), landmark: z.string().trim().max(200).optional(), lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180), is_default: z.string().optional() }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: { en: 'Drop a pin and add a label and address.', ne: 'नक्सामा स्थान राख्नुहोस् र नाम तथा ठेगाना लेख्नुहोस्।' } };
  const { sb, user } = await me(); if (!user) return fail('DS_AUTH_REQUIRED');
  const isDefault = p.data.is_default === 'on';
  if (isDefault) await sb.from('saved_addresses').update({ is_default: false }).eq('user_id', user.id);
  const { error } = await sb.from('saved_addresses').insert({ user_id: user.id, label: p.data.label, address_text: p.data.address_text, landmark: p.data.landmark || null, lat: p.data.lat, lng: p.data.lng, is_default: isDefault });
  if (error) return fail(error);
  revalidatePath('/dashboard/addresses');
  return done({ en: 'Address saved.', ne: 'ठेगाना सुरक्षित भयो।' });
}
export async function deleteAddressAction(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail('DS_NOT_FOUND');
  const { sb } = await me(); const { error } = await sb.from('saved_addresses').delete().eq('id', id);
  if (error) return fail(error); revalidatePath('/dashboard/addresses'); return done();
}
export async function defaultAddressAction(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail('DS_NOT_FOUND');
  const { sb, user } = await me(); if (!user) return fail('DS_AUTH_REQUIRED');
  await sb.from('saved_addresses').update({ is_default: false }).eq('user_id', user.id);
  const { error } = await sb.from('saved_addresses').update({ is_default: true }).eq('id', id);
  if (error) return fail(error); revalidatePath('/dashboard/addresses'); return done();
}

export async function addPaymentPrefAction(fd: FormData): Promise<ActionResult> {
  const p = z.object({ provider: z.enum(['cash', 'esewa', 'khalti', 'stripe']), label: z.string().trim().min(1).max(40), account: z.string().trim().max(20).optional(), is_default: z.string().optional() }).safeParse(Object.fromEntries(fd));
  if (!p.success) return fail('DS_BAD_ADDRESS');
  const { sb, user } = await me(); if (!user) return fail('DS_AUTH_REQUIRED');
  const hint = p.data.account && digitsOnly(p.data.account).length >= 7 ? maskPhone(digitsOnly(p.data.account)) : null;   // only a masked hint is ever stored
  if (p.data.is_default === 'on') await sb.from('payment_methods').update({ is_default: false }).eq('user_id', user.id);
  const { error } = await sb.from('payment_methods').insert({ user_id: user.id, provider: p.data.provider, label: p.data.label, account_hint: hint, is_default: p.data.is_default === 'on' });
  if (error) return fail(error);
  revalidatePath('/dashboard/payments'); return done({ en: 'Saved.', ne: 'सुरक्षित भयो।' });
}
export async function deletePaymentPrefAction(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail('DS_NOT_FOUND');
  const { sb } = await me(); const { error } = await sb.from('payment_methods').delete().eq('id', id);
  if (error) return fail(error); revalidatePath('/dashboard/payments'); return done();
}

export async function markNotificationsReadAction(): Promise<ActionResult> {
  const { sb, user } = await me(); if (!user) return fail('DS_AUTH_REQUIRED');
  await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
  revalidatePath('/dashboard', 'layout'); return done();
}
