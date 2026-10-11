import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/session';
import { rateLimit } from '@/lib/security/rate-limit';
import { haversineKm } from '@/lib/utils';

/** Driving route + ETA via OSRM (set OSRM_BASE_URL for your own instance). Falls back to a straight line so tracking never breaks. */
const parse = (v: string | null) => { const [a, b] = (v ?? '').split(',').map(Number); return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180 ? { lat: a, lng: b } : null; };

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await rateLimit(`route:${user.id}`, 30, 60))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const sp = new URL(req.url).searchParams;
  const from = parse(sp.get('from')), to = parse(sp.get('to'));
  if (!from || !to) return NextResponse.json({ error: 'bad_coords' }, { status: 400 });

  const base = process.env.OSRM_BASE_URL ?? 'https://router.project-osrm.org';
  try {
    const r = await fetch(`${base}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`, { signal: AbortSignal.timeout(5000) });
    const j = (await r.json()) as { code: string; routes?: { distance: number; duration: number; geometry: unknown }[] };
    if (j.code === 'Ok' && j.routes?.[0]) return NextResponse.json({ distance_m: j.routes[0].distance, duration_s: j.routes[0].duration, geometry: j.routes[0].geometry }, { headers: { 'Cache-Control': 'private, max-age=10' } });
  } catch { /* fall through */ }
  const km = haversineKm(from, to) * 1.3;
  return NextResponse.json({ distance_m: km * 1000, duration_s: (km / 22) * 3600, fallback: true, geometry: { type: 'LineString', coordinates: [[from.lng, from.lat], [to.lng, to.lat]] } });
}
