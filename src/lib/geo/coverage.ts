/**
 * coverage.ts – pure geographic utilities for the service-area feature.
 * No DOM, no Next.js imports → safe to import from server actions, API routes,
 * and unit tests.
 */

/** Haversine great-circle distance in kilometres. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371.0088;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Returns true when the client's point falls inside the worker's service circle. */
export function isWorkerInRange(
  workerArea: { center_lat: number; center_lng: number; radius_km: number },
  clientPoint: { lat: number; lng: number },
): boolean {
  return (
    haversineKm(
      { lat: workerArea.center_lat, lng: workerArea.center_lng },
      clientPoint,
    ) <= Number(workerArea.radius_km)
  );
}

/** Clamp a radius value to the allowed [1, 50] km range. */
export function clampRadiusKm(km: number): number {
  return Math.min(50, Math.max(1, km));
}
