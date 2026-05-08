export function haversineKm(start, end) {
  if (!start || !end) return 0;

  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(end.latitude - start.latitude);
  const dLon = toRad(end.longitude - start.longitude);
  const lat1 = toRad(start.latitude);
  const lat2 = toRad(end.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function estimateMinutes(distanceKm, speedKmPerHour = 28) {
  if (!distanceKm) return 0;
  return Math.max(8, Math.round((distanceKm / speedKmPerHour) * 60));
}

export function buildFallbackRoute(start, end) {
  if (!start || !end) return [];

  const curveLatitude = (start.latitude + end.latitude) / 2 + (end.longitude - start.longitude) * 0.08;
  const curveLongitude = (start.longitude + end.longitude) / 2 - (end.latitude - start.latitude) * 0.08;

  return [
    start,
    { latitude: curveLatitude, longitude: curveLongitude },
    end,
  ];
}

export async function fetchRoutePath(start, end) {
  if (!start || !end) return [];

  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start.longitude},${start.latitude};${end.longitude},${end.latitude}` +
    `?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const coordinates = data?.routes?.[0]?.geometry?.coordinates;

    if (Array.isArray(coordinates) && coordinates.length > 1) {
      return coordinates.map(([longitude, latitude]) => ({ latitude, longitude }));
    }
  } catch (error) {
    // Fallback route below keeps the UI functional without paid routing services.
  }

  return buildFallbackRoute(start, end);
}
