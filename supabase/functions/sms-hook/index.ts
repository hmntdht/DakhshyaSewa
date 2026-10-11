// Supabase Edge Function: Auth "Send SMS" hook for Nepali phone OTP via Sparrow SMS.
//
// Use this only if you do NOT use one of Supabase's built-in SMS providers (Twilio, MessageBird, Vonage, ...).
// Setup:
//   1. supabase functions deploy sms-hook --no-verify-jwt
//   2. Dashboard -> Authentication -> Hooks -> "Send SMS" -> HTTPS -> https://<project-ref>.functions.supabase.co/sms-hook
//      Generate the secret there, then:
//      supabase secrets set SEND_SMS_HOOK_SECRETS="v1,whsec_..." SPARROW_TOKEN="..." SPARROW_FROM="..."
//   3. Dashboard -> Authentication -> Providers -> Phone: enable it.
// The endpoint is called by Supabase Auth, signed with the Standard Webhooks scheme. Anything else is rejected.
// NOTE: check the request format against your SMS provider's current documentation; adapt sendSms() if it differs.
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function sendSms(toLocal: string, text: string) {
  const r = await fetch('https://api.sparrowsms.com/v2/sms/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: Deno.env.get('SPARROW_TOKEN') ?? '', from: Deno.env.get('SPARROW_FROM') ?? '', to: toLocal, text }),
  });
  if (!r.ok) throw new Error(`sms provider ${r.status}`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: { http_code: 405, message: 'method not allowed' } }, 405);
  const payload = await req.text();
  const secret = (Deno.env.get('SEND_SMS_HOOK_SECRETS') ?? '').replace('v1,whsec_', '');
  let evt: { user: { phone: string }; sms: { otp: string } };
  try { evt = new Webhook(secret).verify(payload, Object.fromEntries(req.headers)) as typeof evt; }
  catch { return json({ error: { http_code: 401, message: 'invalid signature' } }, 401); }

  const local = evt.user.phone.replace(/^\+?977/, '');          // Sparrow expects the 10-digit local number
  if (!/^9[78]\d{8}$/.test(local)) return json({ error: { http_code: 400, message: 'unsupported number' } }, 400);
  try { await sendSms(local, `Daksha Sewa: your code is ${evt.sms.otp}. Never share it with anyone.`); }
  catch (e) { console.error(e); return json({ error: { http_code: 500, message: 'could not send sms' } }, 500); }
  return json({});
});
