/**
 * Static map thumbnail (Content.md §2.2 / §4): a single Web-Mercator raster
 * tile, cover-cropped and centred, with a pin overlaid — no interactive/JS map,
 * no billing. Tapping the thumbnail opens Google Maps via the existing deep
 * link (see `googleMapsUrl` in api.ts).
 *
 * Tile source is keyless OpenStreetMap by default, overridable for production
 * (e.g. a keyed provider / self-hosted tiles) via VITE_STATIC_MAP_TILE_URL —
 * a template using {z}/{x}/{y}. OSM's tile usage policy discourages heavy
 * hotlinking, so swap this in prod.
 */

const TILE_TEMPLATE: string =
  import.meta.env.VITE_STATIC_MAP_TILE_URL ??
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export interface StaticMapTile {
  /** URL of the raster tile that contains the point. */
  url: string
  /** Whether the tile source is OpenStreetMap (→ show attribution). */
  isOsm: boolean
}

/** Fractional tile X (longitude) at a zoom level. */
function lngToTileX(lng: number, z: number): number {
  return ((lng + 180) / 360) * 2 ** z
}

/** Fractional tile Y (latitude) at a zoom level. */
function latToTileY(lat: number, z: number): number {
  const r = (lat * Math.PI) / 180
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z
}

/**
 * Static-map tile for a place, or null when it has no coordinates (address-only
 * restaurants keep the text deep link but no thumbnail).
 */
export function staticMapTile(
  place: { lat: number | null; lng: number | null },
  zoom = 15,
): StaticMapTile | null {
  if (place.lat == null || place.lng == null) return null

  const xi = Math.floor(lngToTileX(place.lng, zoom))
  const yi = Math.floor(latToTileY(place.lat, zoom))

  const url = TILE_TEMPLATE.replace('{z}', String(zoom))
    .replace('{x}', String(xi))
    .replace('{y}', String(yi))

  return { url, isOsm: TILE_TEMPLATE.includes('openstreetmap.org') }
}
