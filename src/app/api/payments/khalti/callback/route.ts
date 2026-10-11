import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { lookupKhalti } from '@/lib/payments/khalti';
import { getPayment, markFailed, markPaid } from '@/lib/payments';

/** Khalti return_url. The `status` query param is untrusted: the lookup API decides. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const to = (path: string) => NextResponse.redirect(`${env.siteUrl}${path}`);
  const pidx = sp.get('pidx'), orderId = sp.get('purchase_order_id');
  if (!pidx || !orderId) return to('/dashboard/bookings?payment=failed');
  const pay = await getPayment(orderId);
  if (!pay || pay.provider_ref !== pidx) return to('/dashboard/bookings?payment=failed');   // pidx must be the one we issued for this payment
  const r = await lookupKhalti(pidx);
  if (!r.completed) { await markFailed(pay, r.raw); return to(`/dashboard/bookings/${pay.booking_id}?paid=0`); }
  const res = await markPaid(pay, pidx, r.raw, r.totalPaisa / 100);
  return to(`/dashboard/bookings/${res.bookingId}?paid=${res.ok ? 1 : 0}`);
}
