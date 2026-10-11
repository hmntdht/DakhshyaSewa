import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { getPayment } from '@/lib/payments';

/** Stripe success/cancel landing. It does NOT mark anything paid (the signed webhook does); it only routes the customer back. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const pay = sp.get('payment') ? await getPayment(sp.get('payment')!) : null;
  if (!pay) return NextResponse.redirect(`${env.siteUrl}/dashboard/bookings`);
  return NextResponse.redirect(`${env.siteUrl}/dashboard/bookings/${pay.booking_id}?${sp.get('cancelled') ? 'paid=0' : 'paid=1'}`);
}
