'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Marker, GeoJSONSource, MapMouseEvent } from 'maplibre-gl';
import { Crosshair, Loader2, Search } from 'lucide-react';
import { useMapLibre } from './useMapLibre';
import { circlePolygon, pinEl } from './geo';
import { useT, useTs } from '../providers';
import { haversineKm } from '@/lib/utils';
import { DHANGADHI } from '@/lib/geo/map-style';
import type { ServiceArea } from '@/types/db';

export interface PickedPlace { lat: number; lng: number; address?: string }
type Hit = { label: string; lat: number; lng: number };

/**
 * Interactive location picker: tap the map or drag the pin, search a place, or use GPS.
 * Service areas are drawn on the map; pins outside them are flagged (and rejected again by the database).
 */
export default function MapPicker({ value, onChange, areas, height = 380 }: { value: { lat: number; lng: number } | null; onChange: (p: PickedPlace) => void; areas: ServiceArea[]; height?: number }) {
  const t = useT(); const ts = useTs();
  const { ref, map, maplibregl } = useMapLibre({ center: value ?? DHANGADHI, zoom: value ? 16 : 13 });
  const marker = useRef<Marker | null>(null);
  const [q, setQ] = useState(''); const [hits, setHits] = useState<Hit[]>([]); const [busy, setBusy] = useState(false); const [gpsErr, setGpsErr] = useState('');
  const cb = useRef(onChange); cb.current = onChange;

  const reverse = useCallback(async (lat: number, lng: number) => {
    try { const r = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`); const j = await r.json(); cb.current({ lat, lng, address: j.address || undefined }); }
    catch { cb.current({ lat, lng }); }
  }, []);
  const place = useCallback((lat: number, lng: number, fly = true) => {
    if (!map) return;
    if (!marker.current) {
      const m = new maplibregl.Marker({ element: pinEl(), draggable: true, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map);
      m.on('dragend', () => { const p = m.getLngLat(); cb.current({ lat: p.lat, lng: p.lng }); reverse(p.lat, p.lng); });
      marker.current = m;
    } else marker.current.setLngLat([lng, lat]);
    if (fly) map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 16), speed: 1.4 });
  }, [map, maplibregl, reverse]);

  // draw service areas (re-added after a style swap)
  useEffect(() => {
    if (!map) return;
    const draw = () => {
      const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: areas.map((a) => circlePolygon(a.center_lat, a.center_lng, Number(a.radius_km))) };
      if (map.getSource('areas')) (map.getSource('areas') as GeoJSONSource).setData(fc);
      else {
        map.addSource('areas', { type: 'geojson', data: fc });
        map.addLayer({ id: 'areas-fill', type: 'fill', source: 'areas', paint: { 'fill-color': '#FABA8D', 'fill-opacity': 0.07 } });
        map.addLayer({ id: 'areas-line', type: 'line', source: 'areas', paint: { 'line-color': '#FABA8D', 'line-width': 1.5, 'line-dasharray': [3, 3], 'line-opacity': 0.8 } });
      }
    };
    draw(); map.on('style.load', draw); return () => { map.off('style.load', draw); };
  }, [map, areas]);

  // click to place
  useEffect(() => {
    if (!map) return;
    const click = (e: MapMouseEvent) => { place(e.lngLat.lat, e.lngLat.lng, false); cb.current({ lat: e.lngLat.lat, lng: e.lngLat.lng }); reverse(e.lngLat.lat, e.lngLat.lng); };
    map.on('click', click); return () => { map.off('click', click); };
  }, [map, place, reverse]);

  // external value changes (saved address chip, restored draft)
  useEffect(() => { if (map && value) { const cur = marker.current?.getLngLat(); if (!cur || Math.abs(cur.lat - value.lat) > 1e-6 || Math.abs(cur.lng - value.lng) > 1e-6) place(value.lat, value.lng); } }, [map, value, place]);

  // debounced search
  useEffect(() => {
    if (q.trim().length < 3) { setHits([]); return; }
    const id = setTimeout(async () => {
      setBusy(true);
      try { const r = await fetch(`/api/geocode?q=${encodeURIComponent(q.trim())}`); setHits(r.ok ? await r.json() : []); } catch { setHits([]); } finally { setBusy(false); }
    }, 450);
    return () => clearTimeout(id);
  }, [q]);

  const locate = () => {
    setGpsErr('');
    if (!navigator.geolocation) return setGpsErr(ts('map.gps_unsupported'));
    navigator.geolocation.getCurrentPosition(
      (p) => { place(p.coords.latitude, p.coords.longitude); cb.current({ lat: p.coords.latitude, lng: p.coords.longitude }); reverse(p.coords.latitude, p.coords.longitude); },
      () => setGpsErr(ts('map.gps_denied')), { enableHighAccuracy: true, timeout: 12000 });
  };

  const outside = value && areas.length > 0 && !areas.some((a) => haversineKm({ lat: a.center_lat, lng: a.center_lng }, value) <= Number(a.radius_km));

  return (
    <div className="relative overflow-hidden rounded-app border border-line" style={{ height }}>
      <div ref={ref} className="absolute inset-0" />
      <div className="absolute left-3 right-14 top-3 z-10 max-w-sm">
        <div className="relative">
          {busy ? <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" /> : <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ts('map.search')} aria-label={ts('map.search')} className="field !rounded-full !bg-elev/95 pl-9 shadow-lg backdrop-blur" />
        </div>
        {hits.length > 0 && (
          <ul className="mt-1.5 max-h-56 overflow-auto rounded-app border border-line bg-elev shadow-2xl">
            {hits.map((h, i) => <li key={i}><button type="button" className="block w-full px-3.5 py-2.5 text-left text-sm hover:bg-fg/5" onClick={() => { setHits([]); setQ(''); place(h.lat, h.lng); cb.current({ lat: h.lat, lng: h.lng, address: h.label }); }}>{h.label}</button></li>)}
          </ul>
        )}
      </div>
      <button type="button" onClick={locate} className="btn btn-primary btn-sm absolute bottom-3 left-3 z-10 shadow-lg"><Crosshair className="h-4 w-4" />{t('map.use_location')}</button>
      {!value && <p className="pointer-events-none absolute bottom-3 right-3 z-10 max-w-[60%] rounded-full bg-elev/95 px-3.5 py-2 text-xs text-muted shadow-lg">{t('map.tap_hint')}</p>}
      {outside && <p className="absolute bottom-3 right-3 z-10 max-w-[60%] rounded-full bg-bad px-3.5 py-2 text-xs font-medium text-bg shadow-lg">{t('map.outside')}</p>}
      {gpsErr && <p className="absolute left-3 top-16 z-10 rounded-app bg-bad px-3 py-2 text-xs text-bg">{gpsErr}</p>}
    </div>
  );
}
