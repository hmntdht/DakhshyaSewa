'use client';
/**
 * ServiceAreaEditor – client wrapper that holds the LeafletAreaPicker state
 * and injects hidden inputs so the parent <ActionForm> server action can read them.
 *
 * Used on the worker profile edit page (/worker/profile).
 */
import { useState } from 'react';
import { LeafletAreaPicker } from '../map';
import type { ServiceCircle } from '../map';

interface Props {
  initialLat: number | null;
  initialLng: number | null;
  initialRadiusKm: number | null;
}

// Attariya, Kailali defaults (mirrors LeafletAreaPicker)
const ATTARIYA_DEFAULT: ServiceCircle = { lat: 28.7833, lng: 80.5167, radiusKm: 5 };

export function ServiceAreaEditor({ initialLat, initialLng, initialRadiusKm }: Props) {
  const [area, setArea] = useState<ServiceCircle>(() => {
    if (initialLat != null && initialLng != null && initialRadiusKm != null) {
      return { lat: initialLat, lng: initialLng, radiusKm: initialRadiusKm };
    }
    return ATTARIYA_DEFAULT;
  });

  return (
    <section>
      <h2 className="mb-2 text-2xl font-light tracking-tight">Service area</h2>
      <p className="mb-5 text-sm text-muted">
        Drag the circle or use the slider to adjust where you are willing to travel.
        Customers outside this area will not see you in search results.
      </p>
      <LeafletAreaPicker value={area} onChange={setArea} height={400} minKm={1} maxKm={50} />
      {/* Hidden inputs picked up by updateWorkerProfileAction */}
      <input type="hidden" name="area_lat" value={area.lat} />
      <input type="hidden" name="area_lng" value={area.lng} />
      <input type="hidden" name="area_radius_km" value={area.radiusKm} />
    </section>
  );
}
