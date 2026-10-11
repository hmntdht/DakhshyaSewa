'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSiteConfig } from '@/lib/config';
import { clientIp, rateLimit, userAgent } from '@/lib/security/rate-limit';
import { startEsewa } from '@/lib/payments/esewa';
import { startKhalti } from '@/lib/payments/khalti';
import { startStripe } from '@/lib/payments/stripe';
import { attachRef, preparePayment, type StartResult } from '@/lib/payments';
import { done, fail, RATE_LIMITED, toMsg, type ActionResult } from '@/lib/errors';
import type { BookingStatus, Provider, Quote } from '@/types/db';

const uuid = z.string().uuid();

// ───────── quote (read-only; the database is the single source of truth for prices) ─────────
export async function quoteAction(input: { workerId: string; categoryId: string; hours: number; promo?: string }): Promise<ActionResult<Quote>> {
  const p = z.object({ workerId: uuid, categoryId: uuid, hours: z.number().min(0.5).max(12), promo: z.string().trim().max(24).optional() }).safeParse(input);
  if (!p.success) return fail('DS_BAD_DURATION');
  try {
    const sb = await createClient();
    const { data, error } = await sb.rpc('quote_booking', { p_worker_id: p.data.workerId, p_category_id: p.data.categoryId, p_hours: p.data.hours, p_code: p.data.promo || null });
    if (error) throw error;
    return done(undefined, data as Quote);
  } catch (e) { return fail(e); }
}

// ───────── create ─────────
const createSchema = z.object({
  workerId: uuid, categoryId: uuid, startIso: z.string().datetime({ offset: true }), hours: z.number().min(0.5).max(12),
  address: z.string().trim().min(3).max(300), landmark: z.string().trim().max(200).optional(),
  lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180),
  notes: z.string().trim().max(600).optional(), promo: z.string().trim().max(24).optional(),
  provider: z.enum(['cash', 'esewa', 'khalti', 'stripe']), signedName: z.string().trim().min(2).max(80), agree: z.literal(true),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/).optional(), saveAs: z.string().trim().max(40).optional(),
});
export type CreateBookingInput = z.input<typeof createSchema>;

export async function createBookingAction(input: CreateBookingInput): Promise<ActionResult<{ id: string; code: string; pay: StartResult | null }>> {
  const p = createSchema.safeParse(input);
  if (!p.success) return fail('DS_CONTRACT_NOT_ACCEPTED');
  const d = p.data;
  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return fail('DS_AUTH_REQUIRED');
    if (!(await rateLimit(`book:${user.id}`, 8, 600))) return { ok: false, error: RATE_LIMITED };

    if (d.phone) await sb.from('profiles').update({ phone: d.phone }).eq('id', user.id);
    const { data, error } = await sb.rpc('create_booking', {
      p_worker_id: d.workerId, p_category_id: d.categoryId, p_scheduled_start: d.startIso, p_duration_hours: d.hours,
      p_address_text: d.address, p_landmark: d.landmark ?? null, p_lat: d.lat, p_lng: d.lng, p_notes: d.notes ?? null,
      p_promo_code: d.promo || null, p_payment_provider: d.provider, p_signed_name: d.signedName, p_accepted_terms: d.agree,
      p_ip: await clientIp(), p_user_agent: await userAgent(),
    });
    if (error) throw error;
    const b = data as { id: string; code: string; total_amount: number; payment_provider: Provider; customer_name: string };

    if (d.saveAs) await sb.from('saved_addresses').insert({ user_id: user.id, label: d.saveAs, address_text: d.address, landmark: d.landmark ?? null, lat: d.lat, lng: d.lng });

    let pay: StartResult | null = null;
    if (b.payment_provider !== 'cash') { try { pay = await launch(b); } catch (e) { console.error('[payments] start failed', (e as Error).message); } }
    revalidatePath('/dashboard', 'layout');
    return done(undefined, { id: b.id, code: b.code, pay });
  } catch (e) { return fail(e); }
}

async function launch(b: { id: string; code: string; total_amount: number; payment_provider: Provider; customer_name: string }): Promise<StartResult> {
  const pay = await preparePayment(b.id, b.payment_provider, Number(b.total_amount));
  if (b.payment_provider === 'esewa') return startEsewa(pay);
  if (b.payment_provider === 'khalti') { const r = await startKhalti(pay, b.code, b.customer_name); await attachRef(pay.id, r.pidx); return { type: 'redirect', url: r.url }; }
  const cfg = (await getSiteConfig()).payments;
  const r = await startStripe(pay, b.code, cfg.stripe_currency, cfg.stripe_npr_per_unit); await attachRef(pay.id, r.id);
  return { type: 'redirect', url: r.url };
}

/** "Pay now / try again" from the booking page. Ownership is enforced by RLS on the booking read. */
export async function startPaymentAction(bookingId: string): Promise<ActionResult<StartResult>> {
  if (!uuid.safeParse(bookingId).success) return fail('DS_NOT_FOUND');
  try {
    const sb = await createClient();
    const { data: b } = await sb.from('bookings').select('id,code,total_amount,payment_provider,payment_status,status,customer_name').eq('id', bookingId).maybeSingle();
    if (!b) return fail('DS_NOT_FOUND');
    if (b.status !== 'pending' || b.payment_provider === 'cash' || b.payment_status === 'paid') return fail('DS_BAD_TRANSITION');
    if (!(await rateLimit(`pay:${b.id}`, 6, 600))) return { ok: false, error: RATE_LIMITED };
    return done(undefined, await launch(b));
  } catch (e) { return fail(e); }
}

// ───────── lifecycle ─────────
export async function setStatusAction(bookingId: string, to: BookingStatus, reason?: string): Promise<ActionResult> {
  if (!uuid.safeParse(bookingId).success) return fail('DS_NOT_FOUND');
  try {
    const sb = await createClient();
    const { error } = await sb.rpc('set_booking_status', { p_booking_id: bookingId, p_to: to, p_reason: reason?.slice(0, 300) ?? null });
    if (error) throw error;
    revalidatePath('/dashboard', 'layout'); revalidatePath('/worker', 'layout'); revalidatePath('/admin', 'layout');
    return done();
  } catch (e) { return fail(e); }
}

export async function verifyPinAction(bookingId: string, pin: string): Promise<ActionResult<{ ok: boolean; attemptsLeft: number; locked: boolean }>> {
  if (!uuid.safeParse(bookingId).success || !/^\d{4}$/.test(pin)) return fail('DS_PIN_REQUIRED');
  try {
    const sb = await createClient();
    const { data, error } = await sb.rpc('verify_start_pin', { p_booking_id: bookingId, p_pin: pin });
    if (error) throw error;
    const r = data as { ok: boolean; attempts_left?: number; locked?: boolean };
    if (r.ok) { const s = await setStatusAction(bookingId, 'in_progress'); if (!s.ok) return s; }
    return done(undefined, { ok: r.ok, attemptsLeft: r.attempts_left ?? 0, locked: !!r.locked });
  } catch (e) { return fail(e); }
}

// ───────── review / dispute ─────────
export async function submitReviewAction(fd: FormData): Promise<ActionResult> {
  const p = z.object({ bookingId: uuid, rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(800).optional() }).safeParse(Object.fromEntries(fd));
  if (!p.success) return fail('DS_REVIEW_NOT_ALLOWED');
  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return fail('DS_AUTH_REQUIRED');
    const { error } = await sb.from('reviews').insert({ booking_id: p.data.bookingId, customer_id: user.id, worker_id: user.id, rating: p.data.rating, comment: p.data.comment || null }); // worker_id/customer_id are overwritten by a DB trigger from the booking
    if (error) throw error;
    revalidatePath(`/dashboard/bookings/${p.data.bookingId}`); revalidatePath('/', 'layout');
    return done({ en: 'Thank you for your review.', ne: 'तपाईंको समीक्षाका लागि धन्यवाद।' });
  } catch (e) { return fail(e); }
}

export async function openDisputeAction(fd: FormData): Promise<ActionResult> {
  const p = z.object({ bookingId: uuid, reason: z.string().trim().min(3).max(120), details: z.string().trim().max(2000).optional() }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: toMsg('') };
  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return fail('DS_AUTH_REQUIRED');
    const { error } = await sb.from('disputes').insert({ booking_id: p.data.bookingId, opened_by: user.id, reason: p.data.reason, details: p.data.details || null });
    if (error) throw error;
    revalidatePath(`/dashboard/bookings/${p.data.bookingId}`);
    return done({ en: 'Your complaint is with our team. We will contact you.', ne: 'तपाईंको उजुरी हाम्रो टोलीसँग छ। हामी सम्पर्क गर्नेछौं।' });
  } catch (e) { return fail(e); }
}
