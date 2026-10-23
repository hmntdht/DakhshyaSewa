import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { callbackUrl, money, type PaymentRow, type StartResult } from './index';

// eSewa ePay v2 (HMAC-SHA256 signed form POST). Defaults point at eSewa's public UAT sandbox in development.
const cfg = () => {
  const isProd = process.env.NODE_ENV === 'production';
  const secret = process.env.ESEWA_SECRET_KEY;
  if (isProd && !secret) {
    throw new Error('ESEWA_SECRET_KEY is not configured in production');
  }
  return {
    productCode: process.env.ESEWA_PRODUCT_CODE ?? (isProd ? '' : 'EPAYTEST'),
    secret: secret || '8gBm/:&EnLH',
    formUrl: process.env.ESEWA_FORM_URL ?? 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
    statusUrl: process.env.ESEWA_STATUS_URL ?? 'https://rc.esewa.com.np/api/epay/transaction/status/',
  };
};

function sign(values: Record<string, string>, signedNames: string) {
  const msg = signedNames.split(',').map((n) => `${n}=${values[n]}`).join(',');
  return createHmac('sha256', cfg().secret).update(msg).digest('base64');
}

export function startEsewa(p: PaymentRow): StartResult {
  const c = cfg(); const total = money(Number(p.amount));
  const names = 'total_amount,transaction_uuid,product_code';
  const fields: Record<string, string> = {
    amount: total, tax_amount: '0', total_amount: total, transaction_uuid: p.id, product_code: c.productCode,
    product_service_charge: '0', product_delivery_charge: '0',
    success_url: callbackUrl('/api/payments/esewa/callback'), failure_url: callbackUrl('/api/payments/esewa/callback?failed=1'),
    signed_field_names: names,
  };
  fields.signature = sign(fields, names);
  return { type: 'form', url: c.formUrl, fields };
}

export interface EsewaResult { ok: boolean; paymentId?: string; ref?: string; total?: number; raw?: unknown }

/** Decode the base64 `data` eSewa appends to success_url, verify its signature, then confirm server-to-server. */
export async function verifyEsewa(dataB64: string | null): Promise<EsewaResult> {
  if (!dataB64) return { ok: false };
  let body: Record<string, string>;
  try { body = JSON.parse(Buffer.from(dataB64, 'base64').toString('utf8')); } catch { return { ok: false }; }
  const names = body.signed_field_names;
  if (!names || !body.signature) return { ok: false };
  const expected = Buffer.from(sign(body, names)); const got = Buffer.from(body.signature);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return { ok: false, raw: body };
  if (body.status !== 'COMPLETE') return { ok: false, paymentId: body.transaction_uuid, raw: body };

  const c = cfg();
  const total = String(body.total_amount).replace(/,/g, '');
  const url = `${c.statusUrl}?product_code=${encodeURIComponent(c.productCode)}&total_amount=${encodeURIComponent(total)}&transaction_uuid=${encodeURIComponent(body.transaction_uuid)}`;
  try {
    const r = await fetch(url, { cache: 'no-store' });
    const j = (await r.json()) as { status?: string; ref_id?: string };
    if (j.status !== 'COMPLETE') return { ok: false, paymentId: body.transaction_uuid, raw: j };
    return { ok: true, paymentId: body.transaction_uuid, ref: j.ref_id ?? body.transaction_code, total: Number(total), raw: { callback: body, status: j } };
  } catch (e) {
    console.error('[esewa] status check failed', (e as Error).message);
    return { ok: false, paymentId: body.transaction_uuid };
  }
}
