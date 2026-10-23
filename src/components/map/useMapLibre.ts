'use client';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as maplibregl from 'maplibre-gl';
type MLMap = maplibregl.Map;
import { useEffect, useRef, useState } from 'react';
import { buildMapStyle, DHANGADHI } from '@/lib/geo/map-style';
import { useLang } from '../providers';

/** Creates one MapLibre map per mount, follows the light/dark toggle, and always cleans up (no leaked WebGL contexts). */
export function useMapLibre(opts: { center?: { lat: number; lng: number }; zoom?: number } = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MLMap | null>(null);
  const { theme } = useLang();
  const themeRef = useRef(theme); themeRef.current = theme;
  const first = useRef(true);

  useEffect(() => {
    if (!ref.current) return;
    const c = opts.center ?? DHANGADHI;
    const m = new maplibregl.Map({ container: ref.current, style: buildMapStyle(themeRef.current), center: [c.lng, c.lat], zoom: opts.zoom ?? 13, attributionControl: { compact: true }, pitchWithRotate: false, dragRotate: false });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.touchZoomRotate.disableRotation();
    m.on('load', () => setMap(m));
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(ref.current);
    return () => { ro.disconnect(); m.remove(); setMap(null); first.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;
    if (first.current) { first.current = false; return; }
    map.setStyle(buildMapStyle(theme));
  }, [theme, map]);

  return { ref, map, maplibregl };
}
