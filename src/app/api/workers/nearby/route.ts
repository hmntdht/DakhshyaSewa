import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';
import { isWorkerInRange } from '@/lib/geo/coverage';
import { haversineKm } from '@/lib/geo/coverage';

/**
 * GET /api/workers/nearby?lat=&lng=&category=
 *
 * Returns workers whose service circle contains the client point (lat, lng).
 * Optionally filtered by category UUID.
 * Results are sorted nearest-first by distance from the client point.
 *
 * Query params:
 *   lat       – client latitude  (required, -90..90)
 *   lng       – client longitude (required, -180..180)
 *   category  – service_categories UUID (optional)
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const lat = parseFloat(sp.get('lat') ?? '');
  const lng = parseFloat(sp.get('lng') ?? '');
  const category = sp.get('category') ?? '';

  // Validate coordinates
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid lat/lng' }, { status: 400 });
  }

  const db = createPublicClient();

  // Fetch all approved, listed workers with their service areas
  let query = db
    .from('workers')
    .select(
      'id,display_name,display_name_ne,avatar_url,headline_en,rating_avg,rating_count,jobs_completed,worker_services(category_id,rate),worker_service_areas!inner(center_lat,center_lng,radius_km)',
    )
    .eq('status', 'approved')
    .eq('is_listed', true);

  if (UUID.test(category)) {
    query = query.eq('worker_services.category_id', category);
  }

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const clientPoint = { lat, lng };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inRange = (data ?? []).filter((w: any) => {
    const area = w.worker_service_areas?.[0];
    if (!area) return false;
    return isWorkerInRange(
      { center_lat: Number(area.center_lat), center_lng: Number(area.center_lng), radius_km: Number(area.radius_km) },
      clientPoint,
    );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }).map((w: any) => {
    const area = w.worker_service_areas[0];
    const distKm = haversineKm(
      { lat: Number(area.center_lat), lng: Number(area.center_lng) },
      clientPoint,
    );
    return { ...w, worker_service_areas: undefined, distKm: Math.round(distKm * 10) / 10 };
  });

  // Sort nearest-first
  inRange.sort((a: { distKm: number }, b: { distKm: number }) => a.distKm - b.distKm);

  return NextResponse.json(inRange, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
