# Security design and evaluation protocol

Assets: customer identity & home locations, worker ID documents, live worker positions, payment state, admin powers.
Actors: anonymous visitors, malicious customers, malicious/curious workers, compromised browser sessions, bots.

## 1. Controls by OWASP Top 10 (2021)

| Risk | Control in this codebase |
|---|---|
| **A01 Broken access control** | RLS on **every** table (deny by default). Writes to bookings, secrets, payments, locations only via `SECURITY DEFINER` RPCs or the service role. `protect_*` triggers freeze role/status/rating/commission columns. Worker never sees the start PIN (separate table). Admin pages check role in the layout **and** every admin action re-checks it **and** RLS has an admin-only policy. Tested in `supabase/tests/smoke_test.sql` |
| **A02 Cryptographic failures** | TLS + HSTS (when `NEXT_PUBLIC_SITE_URL` is https). No card data stored (hosted gateway pages). Contract hashed with SHA-256. Secrets only in env vars; `server-only` import makes a service-key leak into the client bundle a build error. Private worker documents in a private bucket, shown through 5-minute signed URLs |
| **A03 Injection** | No string-built SQL: supabase-js/PostgREST parameterise everything; RPC arguments are typed. Search inputs strip `% , ( ) *` before `.or()` filters. All server inputs validated with zod; admin fields validated per type. No `dangerouslySetInnerHTML` with user data (only static boot script, JSON-LD with `<` escaped, and validated theme CSS). Admin page bodies render through a tiny text-only renderer |
| **A04 Insecure design** | Prices, discounts, availability, service area, double-booking and state transitions enforced in the DB, not the UI. PIN lock after 5 failures (failure counter commits). Online-paid bookings can't be accepted before payment |
| **A05 Misconfiguration** | CSP, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP, no `X-Powered-By`; internal functions `REVOKE`d from `anon/authenticated`; SVG uploads disallowed; bucket size/MIME limits |
| **A06 Vulnerable components** | Small dependency set (Next, React, supabase-js/ssr, zod, maplibre-gl, lucide, tailwind). Run `npm audit` + Dependabot/Renovate in CI; pin and update regularly |
| **A07 Auth failures** | Supabase Auth (hashed passwords, JWT rotation, OTP/Google). Server always uses `getUser()` (validated), never trusts the cookie alone. Login `next` param validated (no open redirect). Signup cannot set role (trigger ignores metadata). Recommended: Supabase CAPTCHA (Turnstile/hCaptcha) + leaked-password protection + admin MFA (see §5) |
| **A08 Integrity failures** | Payment callbacks verified server-side (eSewa HMAC + status API, Khalti lookup, Stripe webhook signature on the **raw** body, 5-min tolerance); amount re-checked; idempotent `markPaid`; partial unique index allows one paid payment per booking. Hashed, immutable contract snapshot per booking |
| **A09 Logging & monitoring** | `audit_logs` for every admin change; `x-request-id` header; payment payloads stored in `payments.provider_payload`; `tracking_pings` kept 14 days for disputes. Add Sentry/Logflare + uptime check on `/api/health` |
| **A10 SSRF** | Server-side fetches go only to configured hosts (Nominatim/OSRM/gateways); user input is only ever a query parameter, never a URL |

**CSRF**: auth cookies are `SameSite=Lax`; Server Actions get Next's Origin/Host check; mutating Route Handlers are rejected by middleware when `Origin`/`Sec-Fetch-Site` is cross-site (webhooks are exempt and signature-verified; payment return URLs are GET + server verification).
**XSS**: React escaping everywhere + CSP. The CSP keeps `script-src 'unsafe-inline'` because Next injects inline bootstrap scripts and the public pages are static (nonces need dynamic rendering). Since no page renders untrusted HTML this is a reasonable trade-off; the upgrade path is nonce-based CSP in middleware for the dynamic areas (`/admin`, `/dashboard`, `/worker`, `/book`).
**Rate limiting**: middleware burst limit on `/api` & `/auth` (per IP); `rateLimit()` per user/IP on booking creation (8/10 min), payment start, geocode/route, enquiries (5/h), worker applications. Backends: Upstash Redis → Postgres `consume_rate_limit()` → memory. Auth endpoints additionally have Supabase's own limits.

## 2. RLS matrix (summary)

| Table | anon | customer | worker | admin |
|---|---|---|---|---|
| site_settings, categories, areas, faqs, pages, contract_templates, testimonials | read public rows | same | same | all |
| promo_offers | rows flagged `show_on_home` | same | same | all |
| workers | approved & listed | same | own row (columns frozen) | all |
| worker_private | none | none | own | all |
| bookings | none | own | assigned | all (update) |
| booking_secrets (PIN) | none | own | **none** | all |
| payments | none | own bookings (read) | assigned (read) | read + update |
| live_locations | none | own booking | assigned | all |
| tracking_pings | none | none | none | read |
| reviews | public ones | insert for own completed booking | read | all |
| disputes | none | own / party | own / party | all |
| profiles | none | own (role/status frozen) | own | all |
| enquiries, audit_logs, rate_limits | none | none | none | enquiries/audit read; rate_limits service role only |

## 3. Location privacy
* A worker's position exists only while `en_route`/`arrived`; the row is deleted when the job starts or ends.
* Phone numbers are never in public queries; `get_booking_contacts()` returns them only to the counterpart during an active booking.
* Customer addresses are visible only to the customer, the assigned worker and admins.
* Breadcrumbs (14 days) exist for dispute resolution and are admin-only. Disclose this in your privacy policy.

## 4. Payment security
Card details never touch our servers. eSewa/Khalti/Stripe pages are hosted by the gateways. We store: provider, status, amount, gateway reference, and the gateway's verification payload. The client's redirect is never proof of payment. Refunds are recorded by admins (ledger) and executed in the gateway dashboard.

## 5. Recommended hardening (not enabled by default)
* **Admin MFA** (Supabase TOTP) and require it in RLS: change `is_admin()` to also require `auth.jwt() ->> 'aal' = 'aal2'`.
* CAPTCHA on sign-up/OTP (Dashboard → Authentication → Attack Protection).
* Cloudflare/WAF in front for bot and DDoS protection; enable HSTS preload only when all subdomains are https.
* Nonce-based CSP; Subresource Integrity if you self-host scripts.
* Separate Supabase projects for staging/production; restrict who has the service-role key; rotate keys on staff changes.

## 6. Pre-launch evaluation protocol (checklist)

**Automated (run on every deploy)**
- [ ] `npm run typecheck`, `npm run check:copy`, `npm run build`
- [ ] `psql "$STAGING_DATABASE_URL" -f supabase/tests/smoke_test.sql` → *ALL DB CHECKS PASSED*
- [ ] `npm audit --omit=dev` has no high/critical issues

**Manual security tests (use two normal accounts + one admin)**
- [ ] Customer B cannot open Customer A's `/dashboard/bookings/<id>` (404) and `select * from bookings` via the API returns only own rows
- [ ] Worker cannot read `booking_secrets`, cannot set own `status`/`rating` via the REST API
- [ ] Customer cannot `update profiles set role='admin'` (role stays customer)
- [ ] Direct `POST /rest/v1/bookings` is refused (no insert policy)
- [ ] Booking at another worker's busy time, outside hours, outside service area, with a used promo, with a disabled gateway → each rejected with the right message
- [ ] 6th wrong PIN is refused even with the right PIN
- [ ] Tamper the eSewa `data` / Khalti `pidx` / Stripe signature → payment **not** marked paid
- [ ] Replay a paid callback → no duplicate effect
- [ ] Cross-site POST to `/auth/signout` → 403; `next=https://evil.example` on login → ignored
- [ ] `/admin/*` as a customer → redirected; admin server actions called by a customer → forbidden
- [ ] Upload `.svg` / `.exe` as avatar or logo → rejected; worker docs bucket not publicly readable
- [ ] Hit `/api/geocode` anonymously → 401; hammer a limited endpoint → 429

**Operations**
- [ ] PITR/backups on and a **restore drill** done once
- [ ] Uptime monitor on `/api/health`, alert on 5xx rate and payment-callback failures
- [ ] Cron / `pg_cron` for `expire_stale_bookings()` verified
- [ ] Production env vars set, `SUPABASE_SERVICE_ROLE_KEY` not exposed, test gateway keys replaced
- [ ] Legal: lawyer reviews agreement, terms, privacy (retention of ID documents, location trail, consent for location sharing)
- [ ] Demo users removed, `DAKSHA200`-style test promos reviewed, real worker onboarding SOP written
- [ ] Incident plan: who rotates keys, who suspends accounts (Admin → Users), how users reach support

## 7. Known gaps
No SMS/email notification delivery yet; web GPS stops when the worker's browser is backgrounded; refunds are manual; admin MFA and CAPTCHA are recommended but not wired; CSP allows inline scripts (see above); maps/geocoding/routing default to free public services that are not for production volume.
