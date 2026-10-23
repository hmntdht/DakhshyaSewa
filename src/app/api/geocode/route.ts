import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/session';
import { rateLimit } from '@/lib/security/rate-limit';

// Place search, proxied so we control the User-Agent (required by Nominatim's policy), cache, and rate limits.
// Swap NOMINATIM_BASE_URL for a commercial geocoder (or self-hosted Photon/Nominatim) before real traffic.
const cache = new Map<string, { at: number; data: unknown }>();

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await rateLimit(`geocode:${user.id}`, 40, 60))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 120);
  if (q.length < 3) return NextResponse.json([]);

  const key = q.toLowerCase(); const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 600_000) return NextResponse.json(hit.data);

  const base = process.env.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org';
  const url = `${base}/search?format=jsonv2&limit=6&countrycodes=np&viewbox=80.0,28.3,81.4,29.2&bounded=0&q=${encodeURIComponent(q)}`;
  try {
    const ua = (process.env.GEOCODER_USER_AGENT ?? 'DakshaSewa/1.0 (contact: info@dakshasewa.com)').replace(/^"|"$/g, '');
    const r = await fetch(url, { headers: { 'User-Agent': ua, 'Accept-Language': 'en,ne' }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error(String(r.status));
    const rows = (await r.json()) as { display_name: string; lat: string; lon: string }[];
    const data = rows.map((x) => ({ label: x.display_name.split(',').slice(0, 4).join(',').trim(), lat: Number(x.lat), lng: Number(x.lon) }));
    cache.set(key, { at: Date.now(), data }); if (cache.size > 500) cache.delete(cache.keys().next().value as string);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[/api/geocode error]:', err);
    return NextResponse.json([]);
  }
}
