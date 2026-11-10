import { GeoPoint } from '../types/emergency';

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng]
  distanceKm: number;
  durationMinutes: number;
  durationSeconds: number;
  source: 'osrm' | 'cached' | 'fallback';
  error?: string;
}

// In-memory cache for routing requests: key = `${origLat.toFixed(3)},${origLng.toFixed(3)}->${destLat.toFixed(3)},${destLng.toFixed(3)}`
const routeCache = new Map<string, { result: RouteResult; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch real driving route from an OSRM-compatible server.
 * Format for OSRM: /route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson
 */
export async function fetchOsrmRoute(
  origin: GeoPoint,
  destination: GeoPoint,
  osrmBaseUrl: string = 'https://router.project-osrm.org/route/v1/driving'
): Promise<RouteResult> {
  const cacheKey = `${origin.latitude.toFixed(3)},${origin.longitude.toFixed(3)}->${destination.latitude.toFixed(3)},${destination.longitude.toFixed(3)}`;
  const cached = routeCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.result, source: 'cached' };
  }

  // OSRM coordinates are specified as longitude,latitude;longitude,latitude
  const coordsParam = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const url = `${osrmBaseUrl}/${coordsParam}?overview=full&geometries=geojson&steps=true`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OSRM server returned HTTP ${res.status}`);
    }

    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(data.message || 'No valid route found between coordinates');
    }

    const route = data.routes[0];
    // GeoJSON coordinates are [lon, lat], Leaflet polyline expects [lat, lon]
    const coordinates: [number, number][] = route.geometry.coordinates.map(
      (pt: [number, number]) => [pt[1], pt[0]]
    );

    const distanceKm = +(route.distance / 1000).toFixed(2);
    const durationSeconds = Math.round(route.duration);
    const durationMinutes = +(route.duration / 60).toFixed(1);

    const result: RouteResult = {
      coordinates,
      distanceKm,
      durationMinutes,
      durationSeconds,
      source: 'osrm',
    };

    routeCache.set(cacheKey, { result, timestamp: now });
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OSRM routing unavailable';
    console.warn(`[WEWOO Routing] OSRM query failed (${message}). Generating fallback navigational route.`);

    // Fallback: Generate curved realistic road-interpolated waypoints rather than a straight cut
    const fallbackCoords = generateRealisticRoadWaypoints(origin, destination);
    const directDistKm = calculateHaversineDistanceKm(origin, destination) * 1.35; // urban factor
    const estSec = Math.round((directDistKm / 45) * 3600); // 45 km/h avg ambulance speed

    return {
      coordinates: fallbackCoords,
      distanceKm: +directDistKm.toFixed(2),
      durationMinutes: +(estSec / 60).toFixed(1),
      durationSeconds: estSec,
      source: 'fallback',
      error: `Notice: OSRM public service (${message}). Displaying estimated road route. For production, configure a dedicated OSRM instance.`,
    };
  }
}

/**
 * Calculates straight-line distance using the Haversine formula
 */
export function calculateHaversineDistanceKm(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.latitude * Math.PI) / 180) *
      Math.cos((p2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Creates multi-point road-like spline when external routing is throttled or offline
 */
function generateRealisticRoadWaypoints(orig: GeoPoint, dest: GeoPoint, numPoints: number = 24): [number, number][] {
  const points: [number, number][] = [];
  const midLat = (orig.latitude + dest.latitude) / 2;
  const midLng = (orig.longitude + dest.longitude) / 2;

  // slight orthogonal displacement for road curve realism
  const dLat = dest.latitude - orig.latitude;
  const dLng = dest.longitude - orig.longitude;
  const perpLat = -dLng * 0.12;
  const perpLng = dLat * 0.12;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    // Quadratic bezier curve interpolation
    const lat = (1 - t) * (1 - t) * orig.latitude + 2 * (1 - t) * t * (midLat + perpLat) + t * t * dest.latitude;
    const lng = (1 - t) * (1 - t) * orig.longitude + 2 * (1 - t) * t * (midLng + perpLng) + t * t * dest.longitude;
    points.push([lat, lng]);
  }
  return points;
}
