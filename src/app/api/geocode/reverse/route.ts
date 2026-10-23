import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/session';
import { rateLimit } from '@/lib/security/rate-limit';

const cache = new Map<string, string>();

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await rateLimit(`rgeo:${user.id}`, 60, 60))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get('lat')), lng = Number(sp.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return NextResponse.json({ error: 'bad_coords' }, { status: 400 });

  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(key)) return NextResponse.json({ address: cache.get(key) });
  const base = process.env.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org';
  try {
    const ua = (process.env.GEOCODER_USER_AGENT ?? 'DakshaSewa/1.0 (contact: info@dakshasewa.com)').replace(/^"|"$/g, '');
    const r = await fetch(`${base}/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`, { headers: { 'User-Agent': ua, 'Accept-Language': 'en,ne' }, signal: AbortSignal.timeout(6000) });
    const j = (await r.json()) as { display_name?: string };
    const address = (j.display_name ?? '').split(',').slice(0, 3).join(',').trim();
    if (address) { cache.set(key, address); if (cache.size > 800) cache.delete(cache.keys().next().value as string); }
    return NextResponse.json({ address });
  } catch { return NextResponse.json({ address: '' }); }
}
