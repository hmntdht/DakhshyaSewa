/** GeoJSON circle (for drawing service areas) */
export function circlePolygon(lat: number, lng: number, km: number, steps = 72): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    const dLat = (km / 111.32) * Math.sin(a);
    const dLng = (km / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.cos(a);
    coords.push([lng + dLng, lat + dLat]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}

export const pinEl = (color = 'rgb(var(--c-primary))') => {
  const el = document.createElement('div');
  el.className = 'ds-pin';
  el.innerHTML = `<svg width="34" height="40" viewBox="0 0 34 40" aria-hidden="true"><path d="M17 1C8.7 1 2 7.6 2 15.7 2 26.5 17 39 17 39s15-12.5 15-23.3C32 7.6 25.3 1 17 1z" fill="${color}"/><circle cx="17" cy="15.5" r="5.5" fill="rgb(var(--c-bg))"/></svg>`;
  return el;
};
