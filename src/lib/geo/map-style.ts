import type { StyleSpecification } from 'maplibre-gl';
import { env } from '@/lib/env';

export const DHANGADHI = { lat: 28.6833, lng: 80.6 };

/**
 * Basemap. Default = CARTO raster tiles (OpenStreetMap data) – fine for development and low traffic.
 * For production set NEXT_PUBLIC_MAP_STYLE_URL (MapTiler / Stadia / self-hosted style JSON) or NEXT_PUBLIC_MAP_TILES.
 */
export function buildMapStyle(mode: 'dark' | 'light'): StyleSpecification | string {
  if (env.mapStyleUrl) return env.mapStyleUrl;
  const tiles = env.mapTiles
    ? [env.mapTiles]
    : ['a', 'b', 'c', 'd'].map((s) => `https://${s}.basemaps.cartocdn.com/${mode === 'dark' ? 'dark_all' : 'light_all'}/{z}/{x}/{y}.png`);
  return {
    version: 8,
    sources: { base: { type: 'raster', tiles, tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap contributors © CARTO' } },
    layers: [{ id: 'base', type: 'raster', source: 'base' }],
  };
}
