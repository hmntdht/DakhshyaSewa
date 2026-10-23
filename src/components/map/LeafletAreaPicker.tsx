'use client';
/**
 * LeafletAreaPicker – reusable "coverage circle" picker for the worker apply/profile form.
 *
 * Fixes applied vs the previous version:
 *  • Default center changed to Attariya, Kailali (28.7833, 80.5167) per spec.
 *  • Default circle is shown immediately on first load (not only after clicking).
 *  • Added Nominatim place-name search to move the center.
 *  • slider min changed to 1 km; numeric input added and kept in sync.
 *  • Summary shows place name (via reverse-geocode) + km.
 *  • Geolocation fallback to Attariya on denial.
 *  • Leaflet CSS loaded via <link> tag inside the component (no import needed at top-level).
 *  • map.invalidateSize() on container becoming visible.
 *  • Circle resizes live as slider/input changes.
 */
import { useEffect, useRef, useState } from 'react';
import { Crosshair, Loader2, MapPin, Minus, Plus, Search, X } from 'lucide-react';
import { clampRadiusKm } from '@/lib/geo/coverage';

export interface ServiceCircle { lat: number; lng: number; radiusKm: number }

interface Props {
  value: ServiceCircle | null;
  onChange: (c: ServiceCircle) => void;
  height?: number;
  minKm?: number;
  maxKm?: number;
}

// Attariya, Kailali, Nepal (verified via OpenStreetMap)
const ATTARIYA = { lat: 28.7833, lng: 80.5167 };
const DEFAULT_RADIUS_KM = 5;

type SearchHit = { label: string; lat: number; lng: number };

export function LeafletAreaPicker({
  value,
  onChange,
  height = 400,
  minKm = 1,
  maxKm = 50,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const centerMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const edgeMarkerRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [placeName, setPlaceName] = useState<string>('');
  const [searchQ, setSearchQ] = useState('');
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [inputRadius, setInputRadius] = useState<string>(
    String((value?.radiusKm ?? DEFAULT_RADIUS_KM).toFixed(1)),
  );

  const onChangeCb = useRef(onChange);
  onChangeCb.current = onChange;

  // Derived current state (with defaults so the circle is visible immediately)
  const cur: ServiceCircle = value ?? { lat: ATTARIYA.lat, lng: ATTARIYA.lng, radiusKm: DEFAULT_RADIUS_KM };

  // Keep numeric input in sync when value prop changes
  useEffect(() => {
    setInputRadius(cur.radiusKm.toFixed(1));
  }, [cur.radiusKm]);

  // ── Nominatim search (debounced) ────────────────────────────────────────
  useEffect(() => {
    if (searchQ.trim().length < 3) { setSearchHits([]); return; }
    const id = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(searchQ.trim())}`);
        setSearchHits(r.ok ? await r.json() : []);
      } catch { setSearchHits([]); } finally { setSearching(false); }
    }, 450);
    return () => clearTimeout(id);
  }, [searchQ]);

  // ── Reverse geocode center ───────────────────────────────────────────────
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const r = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
      const j = await r.json();
      if (j.address) setPlaceName(j.address);
    } catch { /* no-op */ }
  };

  // ── Init Leaflet once ────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    let alive = true;

    import('leaflet').then((L) => {
      if (!alive || !containerRef.current || mapRef.current) return;

      // Fix default icon URLs broken by bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const initCenter: [number, number] = [cur.lat, cur.lng];
      const map = L.map(containerRef.current!, {
        zoomControl: false,
        attributionControl: false,
      }).setView(initCenter, 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);
      L.control.zoom({ position: 'topright' }).addTo(map);
      L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

      // Service area circle – shown immediately with default radius
      const circle = L.circle(initCenter, {
        radius: cur.radiusKm * 1000,
        color: '#3b82f6',
        weight: 2,
        opacity: 0.9,
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
      }).addTo(map);
      circleRef.current = circle;

      // Center marker (draggable dot)
      const centerIcon = L.divIcon({
        html: `<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      const centerM = L.marker(initCenter, {
        icon: centerIcon,
        draggable: true,
        zIndexOffset: 200,
      }).addTo(map);
      centerMarkerRef.current = centerM;

      // Edge handle (◎ east of circle for resizing)
      const edgeIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:white;border:3px solid #3b82f6;box-shadow:0 2px 6px rgba(0,0,0,.3);cursor:ew-resize"></div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      // Compute east edge position
      const edgeLngPos = (lat: number, lng: number, radiusKm: number): [number, number] => {
        const dLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
        return [lat, lng + dLng];
      };

      const edgeM = L.marker(edgeLngPos(cur.lat, cur.lng, cur.radiusKm), {
        icon: edgeIcon,
        draggable: true,
        zIndexOffset: 200,
      }).addTo(map);
      edgeMarkerRef.current = edgeM;

      // Get radius from current marker positions
      const getRadius = (): number => {
        const c = centerM.getLatLng();
        const e = edgeM.getLatLng();
        const dLat = (e.lat - c.lat) * 111.32;
        const dLng = (e.lng - c.lng) * 111.32 * Math.cos((c.lat * Math.PI) / 180);
        return Math.sqrt(dLat * dLat + dLng * dLng);
      };

      // Sync all visual elements and optionally notify React
      const syncAll = (lat: number, lng: number, radiusKm: number, notify = true) => {
        const clamped = clampRadiusKm(Math.max(minKm, Math.min(maxKm, radiusKm)));
        circle.setLatLng([lat, lng]);
        circle.setRadius(clamped * 1000);
        centerM.setLatLng([lat, lng]);
        edgeM.setLatLng(edgeLngPos(lat, lng, clamped));
        if (notify) {
          onChangeCb.current({ lat, lng, radiusKm: clamped });
        }
      };

      // Expose syncAll for external slider / numeric input
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).__syncArea = syncAll;

      // ── Center marker drag ───────────────────────────────────────────────
      centerM.on('drag', () => {
        const pos = centerM.getLatLng();
        const r = Math.max(minKm, Math.min(maxKm, getRadius()));
        circle.setLatLng([pos.lat, pos.lng]);
        circle.setRadius(r * 1000);
        edgeM.setLatLng(edgeLngPos(pos.lat, pos.lng, r));
      });
      centerM.on('dragend', () => {
        const pos = centerM.getLatLng();
        const r = Math.max(minKm, Math.min(maxKm, getRadius()));
        syncAll(pos.lat, pos.lng, r);
        map.fitBounds(circle.getBounds(), { padding: [40, 40], maxZoom: 14, animate: true });
        reverseGeocode(pos.lat, pos.lng);
      });

      // ── Edge marker drag ─────────────────────────────────────────────────
      edgeM.on('drag', () => {
        const c = centerM.getLatLng();
        const r = Math.max(minKm, Math.min(maxKm, getRadius()));
        circle.setRadius(r * 1000);
        onChangeCb.current({ lat: c.lat, lng: c.lng, radiusKm: r });
      });
      edgeM.on('dragend', () => {
        const c = centerM.getLatLng();
        const r = Math.max(minKm, Math.min(maxKm, getRadius()));
        syncAll(c.lat, c.lng, r);
        map.fitBounds(circle.getBounds(), { padding: [40, 40], maxZoom: 14, animate: true });
      });

      // ── Click to move center ─────────────────────────────────────────────
      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        const { lat, lng } = e.latlng;
        const r = Math.max(minKm, Math.min(maxKm, getRadius()));
        syncAll(lat, lng, r);
        map.fitBounds(circle.getBounds(), { padding: [40, 40], maxZoom: 14, animate: true });
        reverseGeocode(lat, lng);
      });

      mapRef.current = map;

      // Ensure Leaflet tile calculations match container size
      const invalidate = () => {
        if (alive && map) {
          map.invalidateSize();
        }
      };

      // Invalidate size immediately, next frame, and after DOM paint
      requestAnimationFrame(invalidate);
      setTimeout(invalidate, 60);
      setTimeout(() => {
        if (alive && map) {
          map.invalidateSize();
          map.fitBounds(circle.getBounds(), { padding: [40, 40], maxZoom: 14 });
        }
      }, 150);
      setTimeout(invalidate, 400);

      // Watch for any container size shifts (sidebar toggles, font load, flex adjustment)
      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
        ro = new ResizeObserver(() => invalidate());
        ro.observe(containerRef.current);
      }

      setMapReady(true);

      // Initial reverse geocode for the default / pre-filled center
      reverseGeocode(cur.lat, cur.lng);

      return () => {
        alive = false;
        ro?.disconnect();
      };
    });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync external value changes (e.g. pre-fill on profile edit) ──────────
  useEffect(() => {
    if (!mapReady || !value || !mapRef.current) return;
    const map = mapRef.current;
    if (circleRef.current) {
      const c = circleRef.current.getLatLng();
      const r = circleRef.current.getRadius() / 1000;
      if (
        Math.abs(c.lat - value.lat) < 0.0001 &&
        Math.abs(c.lng - value.lng) < 0.0001 &&
        Math.abs(r - value.radiusKm) < 0.05
      ) {
        return;
      }
    }
    // Update Leaflet visuals without re-triggering onChange
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (map as any).__syncArea?.(value.lat, value.lng, value.radiusKm, false);
    if (circleRef.current)
      map.fitBounds(circleRef.current.getBounds(), { padding: [40, 40], maxZoom: 14, animate: false });
  }, [mapReady, value?.lat, value?.lng, value?.radiusKm]);

  // ── Radius change from slider / ± buttons ───────────────────────────────
  const changeRadius = (newR: number) => {
    const clamped = clampRadiusKm(Math.max(minKm, Math.min(maxKm, newR)));
    const map = mapRef.current;
    if (!map) {
      onChange({ ...cur, radiusKm: clamped });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (map as any).__syncArea?.(cur.lat, cur.lng, clamped);
    if (circleRef.current)
      map.fitBounds(circleRef.current.getBounds(), { padding: [40, 40], maxZoom: 14, animate: true });
  };

  // ── Geolocation ──────────────────────────────────────────────────────────
  const locate = () => {
    if (!navigator.geolocation) {
      // Fallback to Attariya
      changeCenter(ATTARIYA.lat, ATTARIYA.lng);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { latitude: lat, longitude: lng } = p.coords;
        changeCenter(lat, lng);
      },
      () => {
        // Permission denied → fall back to Attariya
        changeCenter(ATTARIYA.lat, ATTARIYA.lng);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const changeCenter = (lat: number, lng: number) => {
    const map = mapRef.current;
    if (map) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).__syncArea?.(lat, lng, cur.radiusKm);
      if (circleRef.current)
        map.fitBounds(circleRef.current.getBounds(), { padding: [40, 40], maxZoom: 14, animate: true });
    } else {
      onChange({ lat, lng, radiusKm: cur.radiusKm });
    }
    reverseGeocode(lat, lng);
  };

  const selectHit = (h: SearchHit) => {
    setSearchHits([]);
    setSearchQ('');
    setPlaceName(h.label);
    changeCenter(h.lat, h.lng);
  };

  return (
    <div className="space-y-4">
      {/* Map container */}
      <div
        className="relative overflow-hidden rounded-app border border-line bg-muted/10"
        style={{ height }}
      >
        <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" />

        {/* Place search */}
        <div className="absolute left-3 right-14 top-3 z-[400] max-w-xs">
          <div className="relative">
            {searching
              ? <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
              : <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />}
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search place name…"
              className="field !rounded-full !bg-elev/95 pl-9 pr-8 shadow-lg backdrop-blur text-xs"
            />
            {searchQ && (
              <button
                type="button"
                onClick={() => { setSearchQ(''); setSearchHits([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {searchHits.length > 0 && (
            <ul className="mt-1.5 max-h-48 overflow-auto rounded-app border border-line bg-elev shadow-2xl">
              {searchHits.map((h, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs hover:bg-fg/5"
                    onClick={() => selectHit(h)}
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted" />
                    <span className="line-clamp-2">{h.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* GPS button */}
        <button
          type="button"
          onClick={locate}
          className="btn btn-primary btn-sm absolute bottom-3 left-3 z-[400] shadow-lg"
        >
          <Crosshair className="h-4 w-4" />Use my location
        </button>

        {/* Hint */}
        <p className="pointer-events-none absolute right-3 top-3 z-[400] rounded-full bg-elev/90 px-3 py-1.5 text-xs text-muted shadow">
          Drag center or edge
        </p>
      </div>

      {/* Radius controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => changeRadius(cur.radiusKm - 1)}
          disabled={cur.radiusKm <= minKm}
          className="btn btn-outline btn-sm disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>

        <div className="flex flex-1 flex-col gap-1">
          <input
            type="range"
            min={minKm}
            max={maxKm}
            step={1}
            value={cur.radiusKm}
            onChange={(e) => changeRadius(Number(e.target.value))}
            className="w-full accent-[rgb(var(--c-primary))]"
          />
          <div className="flex items-center justify-center gap-2 text-sm">
            <input
              type="number"
              min={minKm}
              max={maxKm}
              step={1}
              value={inputRadius}
              onChange={(e) => setInputRadius(e.target.value)}
              onBlur={() => {
                const n = parseFloat(inputRadius);
                if (!isNaN(n)) changeRadius(n);
                else setInputRadius(cur.radiusKm.toFixed(1));
              }}
              className="w-16 rounded-app border border-line bg-surface px-2 py-1 text-center text-sm tabular-nums focus:border-primary focus:outline-none"
            />
            <span className="text-muted">km radius</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => changeRadius(cur.radiusKm + 1)}
          disabled={cur.radiusKm >= maxKm}
          className="btn btn-outline btn-sm disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Human-readable summary */}
      <div className="rounded-app border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm">
        <p className="font-medium text-blue-600 dark:text-blue-400">Your service area</p>
        <p className="mt-0.5 text-muted">
          Covers <strong>~{cur.radiusKm.toFixed(0)} km</strong> around{' '}
          <strong>{placeName || `${cur.lat.toFixed(4)}, ${cur.lng.toFixed(4)}`}</strong>
        </p>
      </div>
    </div>
  );
}
