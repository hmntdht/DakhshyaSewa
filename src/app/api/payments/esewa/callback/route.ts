import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { verifyEsewa } from '@/lib/payments/esewa';
import { getPayment, markFailed, markPaid } from '@/lib/payments';

/** eSewa redirects the browser here (GET). We verify the signature AND confirm server-to-server before crediting anything. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const to = (path: string) => NextResponse.redirect(`${env.siteUrl}${path}`);
  const r = await verifyEsewa(sp.get('failed') ? null : sp.get('data'));
  if (!r.paymentId && !r.ok) return to('/dashboard/bookings?payment=failed');
  const pay = r.paymentId ? await getPayment(r.paymentId) : null;
  if (!pay) return to('/dashboard/bookings?payment=failed');
  if (!r.ok) { await markFailed(pay, r.raw); return to(`/dashboard/bookings/${pay.booking_id}?paid=0`); }
  const res = await markPaid(pay, r.ref ?? pay.id, r.raw, r.total ?? 0);
  return to(`/dashboard/bookings/${res.bookingId}?paid=${res.ok ? 1 : 0}`);
}
