/**
 * Geo helpers for the restaurant list (step 6): great-circle distance between
 * the viewer and each place, plus a friendly formatter. All client-side —
 * no maps API, no billing (Content.md §4).
 */

export interface Coords {
  lat: number
  lng: number
}

const EARTH_RADIUS_KM = 6371

const toRad = (deg: number) => (deg * Math.PI) / 180

/** Haversine great-circle distance in kilometres between two coordinates. */
export function haversineKm(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/**
 * Distance from `from` to a place, or null when either side lacks coordinates
 * (unknown place location, or the viewer hasn't shared/set a location).
 */
export function distanceKm(
  from: Coords | null,
  place: { lat: number | null; lng: number | null },
): number | null {
  if (!from || place.lat == null || place.lng == null) return null
  return haversineKm(from, { lat: place.lat, lng: place.lng })
}

/** Human-readable distance: "450 m", "2.3 km", "18 km". */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}
