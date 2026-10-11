# Daksha Sewa · दक्ष सेवा

Household-services marketplace for **Dhangadhi, Kailali**. Customers book cleaning, kitchen help, birthday decoration and tuition; pin their door on a map; sign a digital agreement; pay by cash / eSewa / Khalti / card; and **watch the worker arrive live on the map** (like a ride or food app, as a web app first).

Next.js 15 (App Router, TypeScript) · Supabase (Postgres, Auth, RLS, Realtime, Storage) · Tailwind · MapLibre GL.

## What is inside

| Area | Highlights |
|---|---|
| **Public site** | Bilingual (English / नेपाली) premium dark-first theme built from your poster; services, worker profiles, FAQ, offers, enquiry form; static + ISR so it survives traffic spikes |
| **Booking** | 5 steps: service → worker → availability-aware time slots → **map pin** (search, GPS, draggable, service-area geofence) → price quote + **digital agreement** (hashed snapshot) → payment |
| **Live tracking** | Worker's phone streams GPS (Wake Lock, throttled) → Supabase Realtime → customer's map with route, ETA, glide animation, 10 s polling fallback. **Start PIN** proves the right person arrived |
| **Payments** | Cash, **eSewa** (HMAC-signed), **Khalti** (server lookup), **Stripe** (signed webhook). Server verifies every callback; amounts re-checked; idempotent |
| **Customer portal** | Bookings, live tracker, spend analytics, saved addresses, payment preferences, reviews, disputes, notifications |
| **Worker portal** | Application with private ID upload, job requests (realtime), accept / travel / arrive / PIN / complete, earnings chart, profile, rates, hours |
| **Admin (100 % data-driven)** | Theme + colours (live preview), brand/logo, hero, home layout order, announcement bar, **every UI string in EN+NE**, services, offers/promo codes, FAQ, pages, agreement text, service areas, booking rules & fees, payment switches, worker approval (private docs), users, disputes, enquiries, audit log, analytics (GMV, revenue, retention cohorts, worker performance) |
| **Security** | RLS on every table, money/status/PIN/location logic inside Postgres RPCs, CSP + security headers, CSRF origin checks, 3-tier rate limiting, honeypot, signed payment callbacks, admin audit log. See `docs/SECURITY.md` |

## Quick start (about 15 minutes)

**Prerequisites:** Node 20.9+ and a free [Supabase](https://supabase.com) project.

1. **Install**
   ```bash
   npm install
   cp .env.example .env.local        # then fill the three Supabase values
   ```
2. **Database**: from the Supabase dashboard open *SQL Editor* and run, **in order**, `supabase/migrations/0001…0005_*.sql`, then `supabase/seed.sql`.
   (CLI alternative: `supabase link --project-ref <ref> && supabase db push`, then run `seed.sql` in the editor.)
   Optional sanity check: `psql "$DATABASE_URL" -f supabase/tests/smoke_test.sql` → ends with `ALL DB CHECKS PASSED`.
3. **Auth settings** (Dashboard → Authentication → URL Configuration): Site URL = your `NEXT_PUBLIC_SITE_URL`; add `http://localhost:3000/auth/callback` (and your production URL) to *Redirect URLs*.
4. **Run**: `npm run dev` → http://localhost:3000
5. **Become admin**: sign up on the site, then `npm run make-admin -- you@example.com` and open `/admin`.
6. **Try the full flow with demo data** (dev only): `npm run seed:demo` creates 1 customer + 4 approved workers (password printed). Use two browsers: book as the customer, accept and "Start trip" as the worker (Sunita…), and watch the customer's map. Delete the demo users before launch.

> The site renders with built-in defaults even before Supabase is connected, so you can look around first.

### Sign-in methods
* **Email + password**: works out of the box. For production configure custom SMTP (Dashboard → Authentication → SMTP), because the built-in mailer is heavily rate-limited.
* **Google**: Google Cloud Console → OAuth client (Web) → authorised redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`; paste client ID/secret in Dashboard → Authentication → Providers → Google.
* **Phone OTP**: Dashboard → Authentication → Providers → Phone, pick Twilio / MessageBird / Vonage, **or** use the Nepal-friendly route in `supabase/functions/sms-hook` (Send-SMS hook → Sparrow SMS; verify the provider's API before use).

### Maps
Default basemap = CARTO raster tiles over OpenStreetMap data (no key; **development and light traffic only**). For production set `NEXT_PUBLIC_MAP_STYLE_URL` to a MapLibre-compatible style (MapTiler, Stadia, your own) or `NEXT_PUBLIC_MAP_TILES` to a raster template. Geocoding (`NOMINATIM_BASE_URL`) and routing (`OSRM_BASE_URL`) default to the public OSM demo servers: swap for paid/self-hosted ones before real volume. Google Maps can replace MapLibre by re-implementing `src/components/map/*` (3 small files).

### Payments
* **Cash** works immediately. **eSewa** works against eSewa's public sandbox with the defaults in `.env.example` (use their sandbox login from their developer docs). For go-live get merchant credentials and set `ESEWA_*` to the live URLs.
* **Khalti**: put your secret key in `KHALTI_SECRET_KEY` (sandbox base URL by default; live = `https://khalti.com/api/v2`).
* **Stripe** is optional and off by default (Admin → Settings → Payments). Create a webhook to `/api/payments/stripe/webhook` and set `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`. Check Stripe's availability for your business entity.
* Turn gateways on/off any time in **Admin → Payments**. Keys never live in the database.

### Housekeeping job
Pending requests nobody answers expire, and old tracking breadcrumbs are purged by `expire_stale_bookings()`. Either schedule `GET /api/cron/maintenance` with header `Authorization: Bearer $CRON_SECRET` every ~10 min (Vercel Cron, GitHub Actions, cron-job.org) or enable `pg_cron` and run `supabase/optional/pg_cron.sql`.

## Running the admin panel (what to edit where)

| I want to… | Go to |
|---|---|
| Change colours / roundness / light-dark default | Admin → Theme & colours (live preview, instant publish) |
| Swap logo, name, tagline | Admin → Brand & logo |
| Edit hero text, buttons, hero image | Admin → Home hero |
| Reorder or hide home sections | Admin → Home layout |
| Edit any button / label / heading (EN + NE) | Admin → UI text |
| Add a service (Plumbing, Babysitting…) with price & icon | Admin → Services |
| Create coupons / festival offers | Admin → Offers & codes |
| Pause bookings, change commission / VAT / notice period | Admin → Booking rules & fees / Feature switches |
| Approve a worker (view ID + selfie privately) | Admin → Workers |
| Open a new town | Admin → Service areas (centre + radius) |
| Edit the contract customers sign | Admin → Agreement (new version; old bookings keep their signed copy) |

Saving calls `revalidateTag`, so public pages update within about a second, **no redeploy**.

## Deploy

* **Vercel**: import the repo, add the env vars from `.env.example`, set `NEXT_PUBLIC_SITE_URL` to the final https URL, deploy. Add the URL to Supabase redirect URLs.
* **Docker / any VPS**: `docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=… --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=… --build-arg NEXT_PUBLIC_SITE_URL=https://… -t daksha-sewa . && docker run -p 3000:3000 --env-file .env.production daksha-sewa` (put a TLS reverse proxy such as Caddy / nginx in front).
* Set `SUPABASE_SERVICE_ROLE_KEY` **only** as a server-side secret.

## Project layout

```
supabase/migrations/   0001 tables · 0002 RPCs/triggers · 0003 RLS · 0004 storage · 0005 analytics
supabase/seed.sql      default CMS content (editable in /admin)      supabase/tests/  DB behaviour tests
src/app/(site)/        public site, booking, customer + worker portals   src/app/admin/   admin panel
src/app/api/           payments, geocode, route, workers, cron, health   src/middleware.ts  session + guards
src/lib/               supabase clients · config/theme · payments · admin schemas · security · i18n
src/components/        home · booking · map · dashboard · worker · admin · charts
docs/                  ARCHITECTURE.md · SECURITY.md
```

## Checks
```bash
npm run typecheck     # TypeScript
npm run check:copy    # every UI string key used in code exists in the EN/NE dictionary
npm run build         # production build
```

## Honest notes and next steps
* **Background tracking:** a web page only gets GPS while it is open in the foreground; Wake Lock keeps the screen on during a trip. Fully backgrounded tracking needs a native wrapper (Capacitor / React Native) and the same Supabase backend.
* **Notifications:** in-app only. SMS / push (via an Edge Function + Sparrow/Aakash/FCM) is the natural next addition; the `notifications` table and trigger already exist.
* **Refunds:** "Mark as refunded" records the ledger; returning the money is done in the gateway dashboard or in cash.
* **Content defaults** (prices, agreement text, FAQ, privacy/terms) are placeholders. Have a lawyer review the agreement and policies before launch. Testimonials ship inactive on purpose.
* Nepali strings were written carefully but have not been proofread by a native editor; refine them in Admin → UI text.
