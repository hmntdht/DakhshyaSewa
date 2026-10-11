import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import type { Provider } from '@/types/db';

/**
 * Provider-agnostic payment layer.
 *   start*  : create/refresh a `payments` row + talk to the gateway, return where to send the customer
 *   verify  : callbacks/webhooks re-verify with the gateway (signature or server-to-server lookup),
 *             then call markPaid(). The browser redirect alone is NEVER trusted.
 * To add a gateway (Fonepay, IME Pay, ...): add a file next to esewa.ts, implement start + verify, register it in /api/payments/*.
 */
export type StartResult =
  | { type: 'redirect'; url: string }
  | { type: 'form'; url: string; fields: Record<string, string> };

export const callbackUrl = (path: string) => `${env.siteUrl}${path}`;
export const money = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export interface PaymentRow { id: string; booking_id: string; provider: Provider; status: string; amount: number; provider_ref: string | null }

/** One payment row per gateway attempt. A fresh attempt gets a fresh gateway-side transaction id. */
export async function preparePayment(bookingId: string, provider: Provider, amount: number): Promise<PaymentRow> {
  const db = createAdminClient();
  const { data: open } = await db.from('payments').select('*').eq('booking_id', bookingId).eq('provider', provider).eq('status', 'pending').is('provider_ref', null).limit(1).maybeSingle();
  if (open) return open as PaymentRow;
  await db.from('payments').update({ status: 'failed' }).eq('booking_id', bookingId).eq('status', 'pending').neq('provider', 'cash');
  const { data, error } = await db.from('payments').insert({ booking_id: bookingId, provider, status: 'pending', amount }).select('*').single();
  if (error) throw error;
  await db.from('bookings').update({ payment_provider: provider, payment_status: 'pending' }).eq('id', bookingId);
  return data as PaymentRow;
}

export async function attachRef(paymentId: string, ref: string, payload?: unknown) {
  await createAdminClient().from('payments').update({ provider_ref: ref, provider_payload: payload ?? null }).eq('id', paymentId);
}

export async function getPayment(id: string): Promise<PaymentRow | null> {
  const { data } = await createAdminClient().from('payments').select('*').eq('id', id).maybeSingle();
  return (data as PaymentRow | null) ?? null;
}

/** Idempotent: safe to call from both the redirect callback and a webhook. */
export async function markPaid(p: PaymentRow, ref: string, payload: unknown, paidAmount: number): Promise<{ ok: boolean; bookingId: string }> {
  if (Math.abs(paidAmount - Number(p.amount)) > 0.5) {
    console.error('[payments] amount mismatch', { payment: p.id, expected: p.amount, paid: paidAmount });
    return { ok: false, bookingId: p.booking_id };
  }
  const db = createAdminClient();
  if (p.status !== 'paid') {
    const { error } = await db.from('payments').update({ status: 'paid', paid_at: new Date().toISOString(), provider_ref: ref, provider_payload: payload ?? null }).eq('id', p.id).neq('status', 'paid');
    if (error && !/duplicate key/i.test(error.message)) throw error;
  }
  await db.from('bookings').update({ payment_status: 'paid' }).eq('id', p.booking_id);
  return { ok: true, bookingId: p.booking_id };
}

export async function markFailed(p: PaymentRow, payload?: unknown) {
  const db = createAdminClient();
  await db.from('payments').update({ status: 'failed', provider_payload: payload ?? null }).eq('id', p.id).neq('status', 'paid');
  await db.from('bookings').update({ payment_status: 'unpaid' }).eq('id', p.booking_id).neq('payment_status', 'paid');
}
