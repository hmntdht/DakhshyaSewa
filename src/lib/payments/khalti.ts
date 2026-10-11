import 'server-only';
import { callbackUrl, type PaymentRow } from './index';
import { env } from '@/lib/env';

// Khalti ePayment v2. Amounts are in paisa. Default base URL is the sandbox.
const base = () => process.env.KHALTI_BASE_URL ?? 'https://dev.khalti.com/api/v2';
const headers = () => ({ Authorization: `key ${process.env.KHALTI_SECRET_KEY ?? ''}`, 'Content-Type': 'application/json' });

export async function startKhalti(p: PaymentRow, code: string, customerName: string): Promise<{ url: string; pidx: string }> {
  if (!process.env.KHALTI_SECRET_KEY) throw new Error('KHALTI_SECRET_KEY is not set');
  const r = await fetch(`${base()}/epayment/initiate/`, {
    method: 'POST', headers: headers(), cache: 'no-store',
    body: JSON.stringify({
      return_url: callbackUrl('/api/payments/khalti/callback'), website_url: env.siteUrl,
      amount: Math.round(Number(p.amount) * 100), purchase_order_id: p.id, purchase_order_name: `Daksha Sewa ${code}`,
      customer_info: { name: customerName.slice(0, 60) },
    }),
  });
  const j = (await r.json()) as { pidx?: string; payment_url?: string; detail?: string };
  if (!r.ok || !j.pidx || !j.payment_url) throw new Error(`Khalti initiate failed: ${j.detail ?? r.status}`);
  return { url: j.payment_url, pidx: j.pidx };
}

/** Server-to-server lookup: the only source of truth for whether Khalti really took the money. */
export async function lookupKhalti(pidx: string): Promise<{ completed: boolean; totalPaisa: number; raw: unknown }> {
  const r = await fetch(`${base()}/epayment/lookup/`, { method: 'POST', headers: headers(), cache: 'no-store', body: JSON.stringify({ pidx }) });
  const j = (await r.json()) as { status?: string; total_amount?: number; transaction_id?: string };
  return { completed: j.status === 'Completed', totalPaisa: Number(j.total_amount ?? 0), raw: j };
}
