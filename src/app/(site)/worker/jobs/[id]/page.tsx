import { notFound } from 'next/navigation';
import { ExternalLink, MapPin, MessageCircle, Navigation2, Phone, ShieldAlert, StickyNote } from 'lucide-react';
import { requireWorker } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { LiveTrackingMap } from '@/components/map';
import { JobActions } from '@/components/worker/JobActions';
import { StatusTimeline } from '@/components/dashboard/StatusTimeline';
import { Bi } from '@/components/Bi';
import { T } from '@/components/T';
import { Badge, Notice, StatusBadge } from '@/components/ui';
import { fmtDateLong, fmtTime, haversineKm, roughAreaName, roughLatLng, rs, telHref, waHref } from '@/lib/utils';
import type { Booking, LiveLocation } from '@/types/db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { worker } = await requireWorker(`/worker/jobs/${id}`);
  const sb = await createClient();
  const { data } = await sb.from('bookings').select('*, service_categories(name_en,name_ne,icon,slug)').eq('id', id).eq('worker_id', worker.id).maybeSingle();
  const b = data as Booking | null;
  if (!b) notFound();

  const active = ['confirmed', 'en_route', 'arrived', 'in_progress'].includes(b.status);
  const accepted = active || b.status === 'completed';

  // ── Privacy: only reveal exact location after acceptance ─────────────────
  const rough = roughLatLng(b.lat, b.lng);
  const [contacts, loc, areaRow, neighbourhoodName] = await Promise.all([
    active ? sb.rpc('get_booking_contacts', { p_booking_id: id }) : Promise.resolve({ data: null }),
    ['en_route', 'arrived'].includes(b.status) ? sb.from('live_locations').select('*').eq('booking_id', id).maybeSingle() : Promise.resolve({ data: null }),
    // Load worker's own service area to show in-range status
    sb.from('worker_service_areas').select('center_lat,center_lng,radius_km').eq('worker_id', worker.id).maybeSingle(),
    // Only reverse-geocode rough coords for pending jobs (saves calls for accepted ones)
    !accepted ? roughAreaName(rough.lat, rough.lng) : Promise.resolve(''),
  ]);
  const phone = (contacts.data as { customer_phone?: string } | null)?.customer_phone;
  const ownArea = areaRow.data as { center_lat: number; center_lng: number; radius_km: number } | null;

  // Distance from worker's area center to the job (using rough coords for privacy)
  const distKm = ownArea ? haversineKm({ lat: ownArea.center_lat, lng: ownArea.center_lng }, rough) : null;
  const inRange = ownArea && distKm !== null ? distKm <= Number(ownArea.radius_km) : null;

  // Google Maps + OSM directions links (exact, only for accepted)
  const gmaps = accepted ? `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}` : null;
  const osmDir = accepted ? `https://www.openstreetmap.org/directions?to=${b.lat},${b.lng}` : null;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-8">
        <header>
          <p className="text-sm text-muted">{b.code}</p>
          <h1 className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-3xl font-light tracking-tight sm:text-4xl">
            <Bi en={b.service_categories?.name_en} ne={b.service_categories?.name_ne} />
            <StatusBadge status={b.status} />
          </h1>
          <p className="mt-3 text-muted">{fmtDateLong(b.scheduled_start)}, {fmtTime(b.scheduled_start)} – {fmtTime(b.scheduled_end)} · {b.customer_name}</p>
        </header>

        {(active || b.status === 'pending') && (
          <LiveTrackingMap
            bookingId={b.id}
            dest={accepted ? { lat: b.lat, lng: b.lng } : { lat: rough.lat, lng: rough.lng }}
            initial={(loc.data as LiveLocation | null) ?? null}
            live={['en_route', 'arrived'].includes(b.status)}
            workerName={worker.display_name}
          />
        )}

        {/* Privacy notice for pending jobs */}
        {b.status === 'pending' && (
          <Notice tone="warn" className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Exact address is hidden until you accept. You can see the approximate area on the map.</span>
          </Notice>
        )}

        <JobActions id={b.id} status={b.status} provider={b.payment_provider} total={Number(b.total_amount)} dest={{ lat: b.lat, lng: b.lng }} paid={b.payment_status === 'paid'} />
      </div>

      <aside className="space-y-6">
        <div className="card space-y-4 p-6 text-sm">
          {/* Location — rough for pending, exact for accepted */}
          <p className="flex gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              {accepted ? (
                <>
                  {b.address_text}
                  {b.landmark && <span className="block text-muted">{b.landmark}</span>}
                </>
              ) : (
                <span className="text-muted italic">
                  ~{neighbourhoodName} <span className="ml-1 text-xs">(exact address revealed after accepting)</span>
                </span>
              )}
            </span>
          </p>

          {/* In-range badge */}
          {inRange !== null && (
            <p className="flex items-center gap-2 border-t border-line pt-3">
              <Navigation2 className="h-4 w-4 shrink-0 text-muted" />
              <span className="text-muted">{distKm!.toFixed(1)} km from your area center</span>
              <Badge tone={inRange ? 'ok' : 'warn'}>{inRange ? 'In range' : 'Out of range'}</Badge>
            </p>
          )}

          {/* Directions — only for accepted */}
          {accepted && (gmaps || osmDir) && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              {gmaps && <a href={gmaps} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm"><ExternalLink className="h-3.5 w-3.5" />Google Maps</a>}
              {osmDir && <a href={osmDir} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm"><ExternalLink className="h-3.5 w-3.5" />OSM Directions</a>}
            </div>
          )}

          {b.notes && (
            <p className="flex gap-2.5 border-t border-line pt-4 text-muted">
              <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />"{b.notes}"
            </p>
          )}

          {phone ? (
            <div className="grid grid-cols-2 gap-2 border-t border-line pt-4">
              <a href={telHref(phone)} className="btn btn-primary btn-sm"><Phone className="h-4 w-4" /><T k="track.call" /></a>
              <a href={waHref(phone)} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm"><MessageCircle className="h-4 w-4" />WhatsApp</a>
            </div>
          ) : (
            <p className="border-t border-line pt-4 text-xs text-muted"><T k="worker.phone_after_accept" /></p>
          )}

          <dl className="space-y-2 border-t border-line pt-4">
            <div className="flex justify-between text-muted"><dt><T k="worker.customer_pays" /></dt><dd>{rs(b.total_amount)}</dd></div>
            <div className="flex justify-between text-muted"><dt>{b.payment_provider}</dt><dd>{b.payment_status}</dd></div>
            <div className="flex items-baseline justify-between border-t border-line pt-3"><dt className="font-medium"><T k="worker.your_payout" /></dt><dd className="text-xl font-semibold">{rs(b.worker_payout)}</dd></div>
          </dl>
        </div>
        <div className="card p-6"><StatusTimeline b={b} /></div>

      </aside>
    </div>
  );
}
