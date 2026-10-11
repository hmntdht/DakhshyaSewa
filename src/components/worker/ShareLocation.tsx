'use client';
import { useEffect, useRef, useState } from 'react';
import { Navigation, RadioTower, TriangleAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { useT, useTs } from '../providers';
import { Notice } from '../ui';
import { haversineKm } from '@/lib/utils';

type State = { status: 'starting' | 'live' | 'denied' | 'unsupported' | 'error'; lastSent?: number; accuracy?: number };

/**
 * Streams the worker's GPS position to Supabase (push_location RPC) while a trip is active.
 * Throttled (>= 5 s apart OR >= 15 m moved), keeps the screen awake with the Wake Lock API, and stops on unmount.
 * Browser limit: a web page only receives GPS while it is open in the foreground. A native wrapper (Capacitor) lifts that later.
 */
export function ShareLocation({ bookingId }: { bookingId: string }) {
  const t = useT(); const ts = useTs();
  const [s, setS] = useState<State>({ status: 'starting' }); const [, tick] = useState(0);
  const last = useRef<{ at: number; lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) { setS({ status: 'unsupported' }); return; }
    const sb = createClient(); let wake: WakeLockSentinel | null = null; let stopped = false;
    const lock = async () => { try { wake = (await navigator.wakeLock?.request('screen')) ?? null; } catch { /* not allowed */ } };
    lock(); const vis = () => { if (document.visibilityState === 'visible' && !stopped) lock(); }; document.addEventListener('visibilitychange', vis);

    const id = navigator.geolocation.watchPosition(async (pos) => {
      const { latitude: lat, longitude: lng, heading, speed, accuracy } = pos.coords; const now = Date.now(); const p = last.current;
      if (p && now - p.at < 5000 && haversineKm(p, { lat, lng }) < 0.015) return;
      last.current = { at: now, lat, lng };
      const { error } = await sb.rpc('push_location', { p_booking_id: bookingId, p_lat: lat, p_lng: lng, p_heading: heading, p_speed: speed, p_accuracy: accuracy });
      setS(error ? { status: 'error' } : { status: 'live', lastSent: now, accuracy });
    }, (e) => setS({ status: e.code === e.PERMISSION_DENIED ? 'denied' : 'error' }), { enableHighAccuracy: true, maximumAge: 4000, timeout: 20000 });

    const ui = setInterval(() => tick((n) => n + 1), 2000);
    return () => { stopped = true; navigator.geolocation.clearWatch(id); clearInterval(ui); document.removeEventListener('visibilitychange', vis); wake?.release().catch(() => {}); };
  }, [bookingId]);

  if (s.status === 'denied') return <Notice tone="error" className="flex gap-3"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{t('worker.gps_denied')}</Notice>;
  if (s.status === 'unsupported') return <Notice tone="error">{ts('map.gps_unsupported')}</Notice>;
  const ago = s.lastSent ? Math.round((Date.now() - s.lastSent) / 1000) : null;
  return (
    <div className="flex items-center gap-4 rounded-app border border-ok/40 bg-ok/10 p-4">
      <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ok/20 text-ok">{s.status === 'live' ? <RadioTower className="h-5 w-5" /> : <Navigation className="h-5 w-5 animate-pulse" />}</span>
      <div className="text-sm"><p className="font-medium">{s.status === 'live' ? t('worker.sharing') : s.status === 'error' ? t('worker.share_retry') : t('worker.share_start')}</p>
        <p className="text-xs text-muted">{ago !== null && `${ago}s · `}{s.accuracy ? `±${Math.round(s.accuracy)} m · ` : ''}{t('worker.keep_open')}</p></div>
    </div>
  );
}
