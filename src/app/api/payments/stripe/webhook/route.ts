import { NextResponse } from 'next/server';
import { verifyStripeSignature } from '@/lib/payments/stripe';
import { getPayment, markPaid } from '@/lib/payments';
import { getSiteConfig } from '@/lib/config';

export const runtime = 'nodejs';

/** Stripe → us. Signature is verified against the RAW body; amounts are re-checked against what we asked Stripe to charge. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const raw = await req.text();
  if (!secret || !verifyStripeSignature(raw, req.headers.get('stripe-signature'), secret)) return new NextResponse('invalid signature', { status: 400 });
  const evt = JSON.parse(raw) as { type: string; data: { object: { id: string; payment_status?: string; amount_total?: number; metadata?: { payment_id?: string; expected_minor?: string } } } };
  if (evt.type === 'checkout.session.completed' || evt.type === 'checkout.session.async_payment_succeeded') {
    const s = evt.data.object; const pay = s.metadata?.payment_id ? await getPayment(s.metadata.payment_id) : null;
    if (pay && s.payment_status === 'paid' && Number(s.amount_total) === Number(s.metadata?.expected_minor)) {
      await markPaid(pay, s.id, s, Number(pay.amount));   // amount_total already matched what we requested
    } else console.error('[stripe] ignored event', evt.type, s.id);
  }
  return NextResponse.json({ received: true });
}
