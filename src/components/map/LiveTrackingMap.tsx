'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Marker } from 'maplibre-gl';
import { LocateFixed } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { useMapLibre } from './useMapLibre';
import { pinEl } from './geo';
import { useT } from '../providers';
import { haversineKm } from '@/lib/utils';
import type { LiveLocation } from '@/types/db';

type Pt = { lat: number; lng: number };
interface Eta { minutes: number; km: number; approx: boolean }

/**
 * Customer-side live tracking. Realtime Postgres Changes on live_locations (RLS: only this booking's customer / worker / admin can
 * receive rows) + a 10 s polling safety net. The marker glides between fixes; the route + ETA refresh when the worker has moved.
 */
export default function LiveTrackingMap({ bookingId, dest, initial, live, workerName }: { bookingId: string; dest: Pt; initial: LiveLocation | null; live: boolean; workerName: string }) {
  const t = useT(); const router = useRouter();
  const { ref, map, maplibregl } = useMapLibre({ center: dest, zoom: 14 });
  const [loc, setLoc] = useState<LiveLocation | null>(initial);
  const [eta, setEta] = useState<Eta | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const worker = useRef<Marker | null>(null);
  const shown = useRef<Pt | null>(null);
  const raf = useRef(0);
  const lastRoute = useRef<{ at: number; p: Pt } | null>(null);
  const followed = useRef(true);
  const lastGeom = useRef<{ coords: [number, number][]; dashed: boolean } | null>(null);

  // destination pin
  useEffect(() => {
    if (!map) return;
    const m = new maplibregl.Marker({ element: pinEl(), anchor: 'bottom' }).setLngLat([dest.lng, dest.lat]).addTo(map);
    return () => { m.remove(); };
  }, [map, maplibregl, dest.lat, dest.lng]);

  // realtime + polling
  useEffect(() => {
    if (!live) { setLoc(null); return; }
    const sb = createClient(); let alive = true;
    const pull = async () => { const { data } = await sb.from('live_locations').select('*').eq('booking_id', bookingId).maybeSingle(); if (alive && data) setLoc(data as LiveLocation); };
    pull();
    const ch = sb.channel(`track:${bookingId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations', filter: `booking_id=eq.${bookingId}` }, (p) => { if (p.eventType !== 'DELETE') setLoc(p.new as LiveLocation); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` }, () => router.refresh())
      .subscribe();
    const poll = setInterval(pull, 10_000);
    return () => { alive = false; clearInterval(poll); sb.removeChannel(ch); };
  }, [bookingId, live, router]);

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(id); }, []);

  const drawRoute = useCallback((coords: [number, number][], dashed: boolean) => {
    if (!map) return;
    lastGeom.current = { coords, dashed };
    const data: GeoJSON.Feature = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } };
    const src = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(data);
    else { map.addSource('route', { type: 'geojson', data }); map.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FABA8D', 'line-width': 4.5, 'line-opacity': 0.9, ...(dashed ? { 'line-dasharray': [1.5, 2] } : {}) } }); }
  }, [map]);

  // a light/dark toggle swaps the basemap style, which drops custom layers: put the route back
  useEffect(() => {
    if (!map) return;
    const redraw = () => { if (lastGeom.current) drawRoute(lastGeom.current.coords, lastGeom.current.dashed); };
    map.on('style.load', redraw); return () => { map.off('style.load', redraw); };
  }, [map, drawRoute]);

  // glide marker + (re)fetch route
  useEffect(() => {
    if (!map || !loc) return;
    const to: Pt = { lat: loc.lat, lng: loc.lng };
    if (!worker.current) {
      const el = document.createElement('div'); el.className = 'ds-worker'; el.setAttribute('aria-label', workerName);
      worker.current = new maplibregl.Marker({ element: el }).setLngLat([to.lng, to.lat]).addTo(map);
      shown.current = to;
      map.fitBounds([[Math.min(to.lng, dest.lng), Math.min(to.lat, dest.lat)], [Math.max(to.lng, dest.lng), Math.max(to.lat, dest.lat)]], { padding: 70, maxZoom: 16, duration: 800 });
    } else {
      const from = shown.current ?? to; const t0 = performance.now(); const dur = 1800;
      cancelAnimationFrame(raf.current);
      const step = (ts: number) => {
        const k = Math.min(1, (ts - t0) / dur), e = k * (2 - k);
        const cur = { lat: from.lat + (to.lat - from.lat) * e, lng: from.lng + (to.lng - from.lng) * e };
        worker.current?.setLngLat([cur.lng, cur.lat]); shown.current = cur;
        if (k < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
      if (followed.current) map.easeTo({ center: [to.lng, to.lat], duration: 1200 });
    }
    const prev = lastRoute.current;
    if (!prev || Date.now() - prev.at > 30_000 || haversineKm(prev.p, to) > 0.15) {
      lastRoute.current = { at: Date.now(), p: to };
      fetch(`/api/route?from=${to.lat},${to.lng}&to=${dest.lat},${dest.lng}`).then((r) => r.json()).then((j) => {
        if (j.geometry) drawRoute(j.geometry.coordinates, !!j.fallback);
        setEta({ minutes: Math.max(1, Math.round(j.duration_s / 60)), km: j.distance_m / 1000, approx: !!j.fallback });
      }).catch(() => {});
    }
  }, [map, maplibregl, loc, dest.lat, dest.lng, drawRoute, workerName]);

  useEffect(() => () => { cancelAnimationFrame(raf.current); worker.current?.remove(); worker.current = null; }, []);
  useEffect(() => { if (!live) { worker.current?.remove(); worker.current = null; (map?.getLayer('route') && map.removeLayer('route')); (map?.getSource('route') && map.removeSource('route')); setEta(null); } }, [live, map]);

  const age = loc ? Math.max(0, Math.round((now - new Date(loc.updated_at).getTime()) / 1000)) : null;
  const stale = age !== null && age > 90;

  return (
    <div className="relative h-[22rem] overflow-hidden rounded-app border border-line sm:h-[28rem]">
      <div ref={ref} className="absolute inset-0" onPointerDown={() => { followed.current = false; }} />
      {live && (
        <div className="absolute left-3 top-3 z-10 rounded-2xl border border-line bg-elev/95 px-4 py-3 shadow-xl backdrop-blur">
          {loc ? (
            <>
              <p className="text-lg font-semibold leading-tight">{eta ? <>{eta.minutes} <span className="text-sm font-normal text-muted">{t('track.min_away')}</span></> : <span className="text-sm text-muted">{t('track.locating')}</span>}</p>
              <p className="mt-0.5 text-xs text-muted">{eta && <>{eta.km.toFixed(1)} km{eta.approx ? ' ~' : ''} · </>}<span className={stale ? 'text-warn' : ''}>{stale ? t('track.last_seen') : t('track.live')} {age !== null && age > 8 ? `${age < 90 ? age + 's' : Math.round(age / 60) + 'm'}` : ''}</span></p>
            </>
          ) : <p className="text-sm text-muted">{t('track.waiting_location')}</p>}
        </div>
      )}
      {loc && <button type="button" className="btn btn-outline btn-sm absolute bottom-3 right-3 z-10 !bg-elev/95 shadow-lg" onClick={() => { followed.current = true; map?.easeTo({ center: [loc.lng, loc.lat], zoom: 15 }); }}><LocateFixed className="h-4 w-4" />{t('track.recenter')}</button>}
    </div>
  );
}
