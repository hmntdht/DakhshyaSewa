'use client';
import dynamic from 'next/dynamic';

// MapLibre touches `window`, so the map bundles load client-side only (and never block first paint).
const Skeleton = () => <div className="h-[22rem] animate-pulse rounded-app border border-line bg-surface" aria-hidden />;
export const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false, loading: Skeleton });
export const LiveTrackingMap = dynamic(() => import('./LiveTrackingMap'), { ssr: false, loading: Skeleton });
export type { PickedPlace } from './MapPicker';
