import { NextResponse } from 'next/server';
import { getWorkersForCategory, type WorkerSort } from '@/lib/queries';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public, CDN-cacheable worker list for a category (used by the booking wizard). Safe fields only. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const category = sp.get('category') ?? '';
  const sort = (['rating', 'price', 'experience'].includes(sp.get('sort') ?? '') ? sp.get('sort') : 'rating') as WorkerSort;
  if (!UUID.test(category)) return NextResponse.json([], { status: 400 });
  const workers = await getWorkersForCategory(category, sort);
  return NextResponse.json(workers, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
}
