import type { StartResult } from './index';

/** Sends the browser to the gateway: a plain redirect (Khalti / Stripe) or an auto-submitted signed form POST (eSewa). */
export function launchPayment(p: StartResult) {
  if (p.type === 'redirect') { window.location.assign(p.url); return; }
  const f = document.createElement('form');
  f.method = 'POST'; f.action = p.url;
  for (const [k, v] of Object.entries(p.fields)) { const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; f.appendChild(i); }
  document.body.appendChild(f); f.submit();
}
