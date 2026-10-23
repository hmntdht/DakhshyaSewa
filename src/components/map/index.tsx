'use client';
import dynamic from 'next/dynamic';

// MapLibre touches `window`, so the map bundles load client-side only (and never block first paint).
const Skeleton = () => <div className="h-[22rem] animate-pulse rounded-app border border-line bg-surface" aria-hidden />;
export const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false, loading: Skeleton });
export const LiveTrackingMap = dynamic(() => import('./LiveTrackingMap'), { ssr: false, loading: Skeleton });
export type { PickedPlace } from './MapPicker';

// Leaflet-based pickers (Leaflet also touches `window` — ssr:false is required)
export const LeafletLocationPicker = dynamic(
  () => import('./LeafletLocationPicker').then((m) => ({ default: m.LeafletLocationPicker })),
  { ssr: false, loading: Skeleton },
);
export const LeafletAreaPicker = dynamic(
  () => import('./LeafletAreaPicker').then((m) => ({ default: m.LeafletAreaPicker })),
  { ssr: false, loading: Skeleton },
);
export type { PickedPoint } from './LeafletLocationPicker';
export type { ServiceCircle } from './LeafletAreaPicker';

