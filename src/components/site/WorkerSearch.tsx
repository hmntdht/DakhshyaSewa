'use client';
/**
 * WorkerSearch – client-side "Find workers near you" page.
 * 
 * The customer picks a location (map click, search, or GPS), chooses an 
 * optional category, and sees only workers whose coverage circle contains 
 * that point. Results are sorted nearest-first.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Crosshair, Loader2, MapPin, Navigation2, Search, SearchX, Star, X } from 'lucide-react';
import { Avatar, Stars } from '@/components/ui';
import { LeafletLocationPicker } from '@/components/map';
import type { PickedPoint } from '@/components/map';
import { rs } from '@/lib/utils';
import type { ServiceArea } from '@/types/db';

interface WorkerResult {
  id: string;
  display_name: string;
  display_name_ne: string | null;
  avatar_url: string | null;
  headline_en: string | null;
  rating_avg: number;
  rating_count: number;
  jobs_completed: number;
  distKm: number;
  worker_services?: { category_id: string; rate: number | null }[];
}

interface Category {
  id: string;
  name_en: string;
  name_ne: string | null;
}

export function WorkerSearch({ categories, areas }: { categories: Category[]; areas: ServiceArea[] }) {
  const [point, setPoint] = useState<PickedPoint | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [workers, setWorkers] = useState<WorkerResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (p: PickedPoint, cat: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError('');
    try {
      const url = new URL('/api/workers/nearby', window.location.origin);
      url.searchParams.set('lat', String(p.lat));
      url.searchParams.set('lng', String(p.lng));
      if (cat) url.searchParams.set('category', cat);
      const r = await fetch(url.toString(), { signal: ctrl.signal });
      if (!r.ok) throw new Error('Search failed');
      setWorkers(await r.json());
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-search when point or category changes
  useEffect(() => {
    if (!point) return;
    search(point, categoryId);
  }, [point, categoryId, search]);

  return (
    <div className="space-y-8">
      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryId('')}
          className={`chip cursor-pointer transition hover:border-primary hover:text-fg ${!categoryId ? 'border-primary bg-primary/10 text-fg' : ''}`}
        >
          All services
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoryId(c.id)}
            className={`chip cursor-pointer transition hover:border-primary hover:text-fg ${categoryId === c.id ? 'border-primary bg-primary/10 text-fg' : ''}`}
          >
            {c.name_en}
          </button>
        ))}
      </div>

      {/* Map location picker */}
      <div>
        <p className="mb-2 text-sm font-medium">Where do you need the service?</p>
        <LeafletLocationPicker
          value={point}
          onChange={setPoint}
          areas={areas}
          height={350}
        />
        {point && (
          <p className="mt-2 text-xs text-muted flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {point.address ?? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}
            <button type="button" onClick={() => { setPoint(null); setWorkers(null); }} className="ml-2 text-bad hover:text-bad/80">
              <X className="h-3 w-3" />
            </button>
          </p>
        )}
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center gap-3 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Finding workers near you…</span>
        </div>
      )}

      {error && <p className="rounded-app border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">{error}</p>}

      {!loading && workers !== null && workers.length === 0 && (
        <div className="rounded-app border border-line bg-surface px-8 py-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted/10 text-muted">
            <SearchX className="h-7 w-7" />
          </div>
          <p className="mt-3 text-lg font-light">No workers cover this area yet</p>
          <p className="mt-2 text-sm text-muted">
            Try a nearby location, or check back later — new workers are joining every week!
          </p>
        </div>
      )}

      {!loading && workers && workers.length > 0 && (
        <div>
          <p className="mb-4 text-sm text-muted">
            {workers.length} worker{workers.length !== 1 ? 's' : ''} cover{workers.length === 1 ? 's' : ''} this location · sorted by distance
          </p>
          <ul className="space-y-3">
            {workers.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/workers/${w.id}`}
                  className="group flex items-center gap-4 rounded-app border border-line bg-surface p-5 transition hover:border-primary/60"
                >
                  <Avatar name={w.display_name} url={w.avatar_url} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{w.display_name}</p>
                    {w.headline_en && <p className="text-sm text-muted truncate">{w.headline_en}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <Stars value={Number(w.rating_avg)} count={w.rating_count} size={12} />
                      <span>{w.jobs_completed} jobs</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="flex items-center gap-1 text-sm font-medium text-primary">
                      <Navigation2 className="h-3.5 w-3.5" />
                      {w.distKm.toFixed(1)} km
                    </p>
                    <p className="text-xs text-muted mt-0.5">away</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!point && !loading && (
        <p className="text-center text-sm text-muted py-8">
          Click on the map, search for a place, or use your GPS to find workers near you.
        </p>
      )}
    </div>
  );
}
