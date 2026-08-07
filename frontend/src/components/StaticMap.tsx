import { googleMapsUrl, type Restaurant } from '../lib/api'
import { staticMapTile } from '../lib/maps'
import { cn } from '@/lib/utils'

type Place = Pick<Restaurant, 'name' | 'address' | 'lat' | 'lng'>

/**
 * A static map thumbnail (single OSM tile, cover-cropped + centred, with a pin)
 * — Content.md §2.2. Renders nothing when the place has no coordinates.
 *
 * `interactive` (default): the thumbnail is a link that opens Google Maps.
 * Set it false when the thumbnail sits inside another link (e.g. a list card
 * that already navigates to the detail page) — avoids nested anchors.
 */
export function StaticMap({
  place,
  zoom = 15,
  className = 'h-40 w-full',
  interactive = true,
}: {
  place: Place
  zoom?: number
  className?: string
  interactive?: boolean
}) {
  const tile = staticMapTile(place, zoom)
  if (!tile) return null

  const base = cn(
    'group relative block overflow-hidden rounded-2xl border border-border bg-popcorn-50',
    className,
  )

  const inner = (
    <>
      <img
        src={tile.url}
        alt=""
        loading="lazy"
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
      />
      {/* Pin at the thumbnail centre (tile is centred on the place, ±one z15 tile). */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-2xl drop-shadow"
      >
        📍
      </span>
      {tile.isOsm && (
        <span className="absolute bottom-0 right-0 bg-white/70 px-1 text-[9px] leading-tight text-butter-700">
          © OpenStreetMap
        </span>
      )}
    </>
  )

  if (!interactive) {
    return <div className={base}>{inner}</div>
  }

  return (
    <a
      href={googleMapsUrl(place)}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open ${place.name} in Google Maps`}
      className={base}
    >
      {inner}
    </a>
  )
}
