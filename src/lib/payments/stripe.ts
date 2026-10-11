import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { callbackUrl, type PaymentRow } from './index';

// Stripe Checkout via the REST API (no SDK needed). Off by default: enable under Admin → Payments.
export async function startStripe(p: PaymentRow, code: string, currency: string, nprPerUnit: number): Promise<{ url: string; id: string; minor: number }> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  const minor = Math.max(50, Math.round((Number(p.amount) / nprPerUnit) * 100));
  const body = new URLSearchParams({
    mode: 'payment', client_reference_id: p.id,
    success_url: callbackUrl(`/api/payments/stripe/return?payment=${p.id}`), cancel_url: callbackUrl(`/api/payments/stripe/return?payment=${p.id}&cancelled=1`),
    'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': currency.toLowerCase(),
    'line_items[0][price_data][unit_amount]': String(minor), 'line_items[0][price_data][product_data][name]': `Daksha Sewa booking ${code}`,
    'metadata[payment_id]': p.id, 'metadata[expected_minor]': String(minor),
  });
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST', body, cache: 'no-store',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `ds-${p.id}` },
  });
  const j = (await r.json()) as { id?: string; url?: string; error?: { message: string } };
  if (!r.ok || !j.url || !j.id) throw new Error(`Stripe error: ${j.error?.message ?? r.status}`);
  return { url: j.url, id: j.id, minor };
}

/** Verify the Stripe-Signature header (t=timestamp,v1=hmac) against the RAW request body. */
export function verifyStripeSignature(raw: string, header: string | null, secret: string, toleranceSec = 300): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=') as [string, string]));
  const t = Number(parts.t); const v1 = parts.v1;
  if (!t || !v1 || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
