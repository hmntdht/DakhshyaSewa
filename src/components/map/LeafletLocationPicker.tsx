'use client';
/**
 * LeafletLocationPicker – "point" mode for the booking wizard.
 * Uses Leaflet (vanilla, no react-leaflet) loaded dynamically so Next.js SSR never touches the DOM API.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Crosshair, Loader2, MapPin, Search, X } from 'lucide-react';
import { useT, useTs } from '../providers';
import type { ServiceArea } from '@/types/db';
import { haversineKm } from '@/lib/utils';

export interface PickedPoint { lat: number; lng: number; address?: string }

interface Props {
  value: PickedPoint | null;
  onChange: (p: PickedPoint) => void;
  areas: ServiceArea[];
  height?: number;
}

type Hit = { label: string; lat: number; lng: number };

const DHANGADHI = { lat: 28.6833, lng: 80.5833 };

export function LeafletLocationPicker({ value, onChange, areas, height = 380 }: Props) {
  const t = useT(); const ts = useTs();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const onChangeCb = useRef(onChange); onChangeCb.current = onChange;

  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [gpsErr, setGpsErr] = useState('');
  const [mapReady, setMapReady] = useState(false);

  // ── reverse geocode ──────────────────────────────────────────────────────
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const r = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
      const j = await r.json();
      onChangeCb.current({ lat, lng, address: j.address || undefined });
    } catch { onChangeCb.current({ lat, lng }); }
  }, []);

  // ── create / move draggable pin ──────────────────────────────────────────
  const placePinRef = useRef<((lat: number, lng: number) => void) | null>(null);

  // ── initialise Leaflet once ──────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    let alive = true;

    import('leaflet').then((L) => {
      if (!alive || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      // Patch default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const center: [number, number] = value ? [value.lat, value.lng] : [DHANGADHI.lat, DHANGADHI.lng];
      const map = L.map(containerRef.current!, { zoomControl: false, attributionControl: false }).setView(center, value ? 16 : 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: 'topright' }).addTo(map);
      L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

      // Draw service-area circles
      areas.forEach((a) => {
        L.circle([a.center_lat, a.center_lng], {
          radius: Number(a.radius_km) * 1000,
          color: '#f97316', weight: 1.5, dashArray: '6 4', opacity: 0.7,
          fillColor: '#f97316', fillOpacity: 0.05,
        }).addTo(map);
      });

      // Custom red pin
      const pinIcon = L.divIcon({
        html: `<svg width="28" height="36" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20S24 21 24 12C24 5.37 18.63 0 12 0z" fill="#ef4444"/>
          <circle cx="12" cy="12" r="4" fill="white"/>
        </svg>`,
        className: '',
        iconSize: [28, 36],
        iconAnchor: [14, 36],
      });

      const createMarker = (lat: number, lng: number) => {
        const m = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
        m.on('dragend', () => {
          const pos = m.getLatLng();
          onChangeCb.current({ lat: pos.lat, lng: pos.lng });
          reverseGeocode(pos.lat, pos.lng);
        });
        markerRef.current = m;
        return m;
      };

      placePinRef.current = (lat, lng) => {
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        else createMarker(lat, lng);
      };

      if (value) createMarker(value.lat, value.lng);

      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        const { lat, lng } = e.latlng;
        if (placePinRef.current) placePinRef.current(lat, lng);
        onChangeCb.current({ lat, lng });
        reverseGeocode(lat, lng);
      });

      mapRef.current = map;
      setMapReady(true);
    });

    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── sync external value → marker / flyTo ────────────────────────────────
  useEffect(() => {
    if (!mapReady || !value) return;
    const cur = markerRef.current?.getLatLng();
    if (cur && Math.abs(cur.lat - value.lat) < 1e-6 && Math.abs(cur.lng - value.lng) < 1e-6) return;
    if (placePinRef.current) placePinRef.current(value.lat, value.lng);
    mapRef.current?.flyTo([value.lat, value.lng], Math.max(mapRef.current.getZoom(), 16), { duration: 0.8 });
  }, [mapReady, value]);

  // ── debounced Nominatim search ───────────────────────────────────────────
  useEffect(() => {
    if (q.trim().length < 3) { setHits([]); return; }
    const id = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(q.trim())}`);
        setHits(r.ok ? await r.json() : []);
      } catch { setHits([]); } finally { setSearching(false); }
    }, 450);
    return () => clearTimeout(id);
  }, [q]);

  const selectHit = (h: Hit) => {
    setHits([]); setQ('');
    onChangeCb.current({ lat: h.lat, lng: h.lng, address: h.label });
    if (mapRef.current) mapRef.current.flyTo([h.lat, h.lng], 16, { duration: 0.8 });
  };

  const locate = () => {
    setGpsErr('');
    if (!navigator.geolocation) { setGpsErr(ts('map.gps_unsupported')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { latitude: lat, longitude: lng } = p.coords;
        onChangeCb.current({ lat, lng });
        reverseGeocode(lat, lng);
        mapRef.current?.flyTo([lat, lng], 17, { duration: 1 });
      },
      () => setGpsErr(ts('map.gps_denied')),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const outside = value && areas.length > 0
    && !areas.some((a) => haversineKm({ lat: a.center_lat, lng: a.center_lng }, value) <= Number(a.radius_km));

  return (
    <div className="relative overflow-hidden rounded-app border border-line bg-muted/10" style={{ height }}>
      <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" />

      {/* Search */}
      <div className="absolute left-3 right-14 top-3 z-[400] max-w-sm">
        <div className="relative">
          {searching
            ? <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
            : <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ts('map.search')} aria-label={ts('map.search')}
            className="field !rounded-full !bg-elev/95 pl-9 pr-8 shadow-lg backdrop-blur" />
          {q && (
            <button type="button" onClick={() => { setQ(''); setHits([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {hits.length > 0 && (
          <ul className="mt-1.5 max-h-56 overflow-auto rounded-app border border-line bg-elev shadow-2xl">
            {hits.map((h, i) => (
              <li key={i}>
                <button type="button" className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm hover:bg-fg/5" onClick={() => selectHit(h)}>
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="line-clamp-2">{h.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* GPS */}
      <button type="button" onClick={locate} className="btn btn-primary btn-sm absolute bottom-3 left-3 z-[400] shadow-lg">
        <Crosshair className="h-4 w-4" />{t('map.use_location')}
      </button>

      {!value && (
        <p className="pointer-events-none absolute bottom-3 right-3 z-[400] max-w-[60%] rounded-full bg-elev/95 px-3.5 py-2 text-xs text-muted shadow-lg">
          {t('map.tap_hint')}
        </p>
      )}
      {outside && (
        <p className="absolute bottom-3 right-3 z-[400] max-w-[60%] rounded-full bg-bad px-3.5 py-2 text-xs font-medium text-bg shadow-lg">
          {t('map.outside')}
        </p>
      )}
      {gpsErr && (
        <p className="absolute left-3 top-16 z-[400] rounded-app bg-bad px-3 py-2 text-xs text-bg">
          {gpsErr}
        </p>
      )}
    </div>
  );
}
