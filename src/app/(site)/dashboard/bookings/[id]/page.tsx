import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KeyRound, MapPin, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';
import { getSiteConfig } from '@/lib/config';
import { LiveTrackingMap } from '@/components/map';
import { BookingActions } from '@/components/dashboard/BookingActions';
import { Bi } from '@/components/Bi';
import { T } from '@/components/T';
import { Avatar, Badge, Notice, PAYMENT_STATUS_LABEL, Stars, StatusBadge } from '@/components/ui';
import { fmtDateLong, fmtTime, telHref, waHref } from '@/lib/utils';
import type { Booking, LiveLocation } from '@/types/db';
import { ServiceGuidelinesView } from '@/components/services/ServiceGuidelinesView';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type SP = { new?: string; paid?: string; pay?: string; payment?: string };

export default async function BookingDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const profile = await requireUser(`/dashboard/bookings/${id}`);
  const sb = await createClient();
  const { data } = await sb.from('bookings').select('*, service_categories(name_en,name_ne,icon,slug), workers(id,display_name,display_name_ne,avatar_url,rating_avg,user_id)').eq('id', id).maybeSingle();
  const b = data as Booking | null;
  if (!b || b.customer_id !== profile.id) notFound();

  const active = ['confirmed', 'en_route', 'arrived', 'in_progress'].includes(b.status);
  const [cfg, secret, loc, contacts, review, disputes] = await Promise.all([
    getSiteConfig(),
    active ? sb.from('booking_secrets').select('start_pin').eq('booking_id', id).maybeSingle() : Promise.resolve({ data: null }),
    ['en_route', 'arrived'].includes(b.status) ? sb.from('live_locations').select('*').eq('booking_id', id).maybeSingle() : Promise.resolve({ data: null }),
    active ? sb.rpc('get_booking_contacts', { p_booking_id: id }) : Promise.resolve({ data: null }),
    sb.from('reviews').select('id').eq('booking_id', id).maybeSingle(),
    sb.from('disputes').select('id,status').eq('booking_id', id),
  ]);
  const pin = (secret.data as { start_pin: string } | null)?.start_pin;
  const phone = (contacts.data as { worker_phone?: string } | null)?.worker_phone;
  const w = b.workers; const live = ['en_route', 'arrived'].includes(b.status) && cfg.features.live_tracking;
  const openDispute = (disputes.data ?? []).some((d: { status: string }) => d.status === 'open' || d.status === 'under_review');
  const canDispute = ['in_progress', 'completed'].includes(b.status) && !openDispute;
  const waiting = b.status === 'pending';

  return (
    <div className="grid gap-10 lg:grid-cols-[1.55fr_1fr]">
      <div className="space-y-8">
        {sp.new && (
          <Notice tone="success">
            <b className="font-medium">Booking placed!</b> We will contact you as soon as possible. Our administrator will contact you shortly to confirm your order and assign a skilled professional.
          </Notice>
        )}
        {sp.paid === '1' && <Notice tone="success"><T k="track.paid_ok" /></Notice>}
        {(sp.paid === '0' || sp.payment === 'failed') && <Notice tone="error"><T k="track.paid_fail" /></Notice>}
        <header>
          <p className="text-sm text-muted">{b.code}</p>
          <h1 className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-3xl font-light tracking-tight sm:text-4xl"><Bi en={b.service_categories?.name_en} ne={b.service_categories?.name_ne} /><StatusBadge status={b.status} /></h1>
          <p className="mt-3 text-muted">{fmtDateLong(b.scheduled_start)}, {fmtTime(b.scheduled_start)} – {fmtTime(b.scheduled_end)}</p>
          {waiting && (
            <div className="mt-3 rounded-app border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm text-amber-600 dark:text-amber-400">
              <p className="font-semibold">Order Pending Confirmation</p>
              <p className="mt-0.5 text-xs text-muted">We will contact you as soon as possible to confirm your order and assign a dedicated professional.</p>
            </div>
          )}
        </header>

        {active && <LiveTrackingMap bookingId={b.id} dest={{ lat: b.lat, lng: b.lng }} initial={(loc.data as LiveLocation | null) ?? null} live={live} workerName={w?.display_name ?? ''} />}
        {active && b.status === 'confirmed' && <p className="-mt-4 text-sm text-muted"><T k="track.tracking_soon" /></p>}

        {pin && b.status !== 'in_progress' && (
          <div className="d-shape-sm flex flex-wrap items-center justify-between gap-5 border border-primary/40 bg-primary/10 p-6 sm:p-7">
            <div className="max-w-sm"><p className="flex items-center gap-2 text-sm font-medium"><KeyRound className="h-4 w-4 text-primary" /><T k="track.pin_title" /></p><p className="mt-1 text-sm text-muted"><T k="track.pin_hint" /></p></div>
            {/* taste-skill-ignore */}
            <p className="tabular-nums text-5xl font-semibold tracking-[0.3em] text-primary" aria-label={`PIN ${pin.split('').join(' ')}`}>{pin}</p>
          </div>
        )}

        <BookingActions id={b.id} status={b.status} payStatus={b.payment_status} provider={b.payment_provider} retryPay={sp.pay === 'retry'}
          canReview={b.status === 'completed' && !review.data && cfg.features.reviews} canDispute={canDispute} />

        <details className="card group p-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden"><ShieldCheck className="h-4 w-4 text-primary" /><T k="track.contract" /></summary>
          <p className="mt-3 text-xs text-muted">{b.signed_name} · {fmtDateLong(b.signed_at)} · <span className="font-mono">SHA-256 {b.contract_hash.slice(0, 16)}…</span></p>
          <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-app bg-bg p-4 font-sans text-xs leading-relaxed text-muted">{b.contract_snapshot}</pre>
        </details>

        {b.service_categories?.slug && (
          <details className="card group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Service Scope (What's Included & Not Included)</span>
              </span>
              <span className="text-xs text-muted">View Scope</span>
            </summary>
            <div className="mt-4 pt-4 border-t border-line">
              <ServiceGuidelinesView slug={b.service_categories.slug} variant="booking" />
            </div>
          </details>
        )}
      </div>

      <aside className="space-y-6">
        <div className="card p-6">
          <h2 className="mb-3 text-sm font-medium text-muted">Assigned Professional</h2>
          {waiting ? (
            <div className="space-y-1.5 text-sm">
              <p className="font-medium text-fg">Manual Assignment in Progress</p>
              <p className="text-xs text-muted">
                Our administrator will contact you shortly to confirm your booking and assign a certified professional.
              </p>
            </div>
          ) : w ? (
            <div>
              <div className="flex items-center gap-4">
                <Avatar name={w.display_name} url={w.avatar_url} size={56} />
                <div>
                  <p className="font-medium"><Bi en={w.display_name} ne={w.display_name_ne} /></p>
                  <Stars value={Number(w.rating_avg)} />
                </div>
              </div>
              {phone ? (
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <a href={telHref(phone)} className="btn btn-primary btn-sm"><Phone className="h-4 w-4" /><T k="track.call" /></a>
                  <a href={waHref(phone)} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm"><MessageCircle className="h-4 w-4" />WhatsApp</a>
                </div>
              ) : (
                <p className="mt-4 text-xs text-muted"><T k="track.phone_later" /></p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted">Professional details will appear once assigned by the administrator.</p>
          )}
        </div>
        <div className="card space-y-4 p-6 text-sm">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Service Location</h3>
            <p className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{b.address_text}{b.landmark && <span className="block text-muted">{b.landmark}</span>}</span></p>
          </div>
          {b.notes && (
            <div className="border-t border-line pt-3">
              <h3 className="mb-1 text-xs font-semibold text-muted">Special Instructions</h3>
              <p className="text-muted italic">“{b.notes}”</p>
            </div>
          )}
          <dl className="space-y-2 border-t border-line pt-3">
            <div className="flex justify-between text-muted">
              <dt>Estimated Duration</dt>
              <dd className="font-medium text-fg">{b.quantity} hour{b.quantity > 1 ? 's' : ''}</dd>
            </div>
            <div className="flex justify-between text-muted">
              <dt>Service Scope</dt>
              <dd className="font-medium text-fg">Verified Scope</dd>
            </div>
          </dl>
          <div className="rounded-xl border border-line/70 bg-elev/40 p-3.5 text-xs text-muted leading-relaxed">
            <Bi
              en="Pricing and settlement details will be confirmed directly with you by our administrator upon review."
              ne="मूल्य र भुक्तानी सम्बन्धी विवरण हाम्रो व्यवस्थापकले सम्पर्क गरी प्रत्यक्ष रूपमा पुष्टि गर्नुहुनेछ।"
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
