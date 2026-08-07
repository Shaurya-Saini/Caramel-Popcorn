import { useEffect, useRef, useState } from 'react'
import { Search, LocateFixed, MapPin } from 'lucide-react'
import { geoSearch, geoReverse, type GeoPlace } from '../lib/api'
import { useLocation } from '../context/LocationContext'
import { useAuth } from '../context/AuthContext'
import { StaticMap } from './StaticMap'
import { Input } from './ui/input'

export interface LocationValue {
  address: string
  lat: number | null
  lng: number | null
}

/**
 * Reusable exact-location picker: search a place (forward geocode) OR use the
 * device's current location (reverse geocode), then confirm on a map preview.
 * Controlled — the parent owns the value.
 */
export function LocationPicker({
  value,
  onChange,
  mapName = '',
}: {
  value: LocationValue
  onChange: (v: LocationValue & { name?: string }) => void
  mapName?: string
}) {
  const { coords } = useLocation()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoPlace[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasLocation = value.lat != null && value.lng != null
  const seq = useRef(0)

  // Bias search toward the user (live coords, else saved profile location).
  const bias =
    coords ??
    (user?.lat != null && user?.lng != null ? { lat: user.lat, lng: user.lng } : null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) {
      setResults(null)
      return
    }
    const mine = ++seq.current
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const { places } = await geoSearch(q, bias)
        if (mine === seq.current) setResults(places)
      } catch {
        if (mine === seq.current) setResults([])
      } finally {
        if (mine === seq.current) setSearching(false)
      }
    }, 450)
    return () => clearTimeout(t)
  }, [query, bias?.lat, bias?.lng])

  function pickPlace(p: GeoPlace) {
    if (p.lat == null || p.lng == null) return
    onChange({ address: p.address || p.displayName, lat: p.lat, lng: p.lng, name: p.name })
    setResults(null)
    setQuery('')
  }

  function useCurrentLocation() {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not available in this browser')
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        let address = ''
        try {
          const { place } = await geoReverse(latitude, longitude)
          if (place) address = place.address || place.displayName
        } catch {
          /* keep the coords even if reverse-geocoding fails */
        }
        onChange({ address, lat: latitude, lng: longitude })
        setLocating(false)
      },
      () => {
        setError('Could not get your location')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    )
  }

  if (hasLocation) {
    return (
      <div className="rounded-2xl border border-border bg-white p-3">
        <StaticMap
          place={{ name: mapName, address: value.address, lat: value.lat, lng: value.lng }}
          interactive={false}
          className="h-32 w-full"
        />
        <Input
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder="Address"
          className="mt-3"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-butter-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {value.lat!.toFixed(5)}, {value.lng!.toFixed(5)}
          </span>
          <button
            type="button"
            onClick={() => onChange({ address: '', lat: null, lng: null })}
            className="font-semibold text-berry-600 hover:underline"
          >
            Change location
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-butter-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a place or address…"
          className="pl-10"
        />
        {(searching || (results && query.trim().length >= 3)) && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-white shadow-lg">
            {searching && <div className="px-4 py-2.5 text-sm text-butter-500">Searching…</div>}
            {!searching && results && results.length === 0 && (
              <div className="px-4 py-2.5 text-sm text-butter-500">
                No matches — try a broader search, or use your current location below.
              </div>
            )}
            {!searching &&
              results?.map((p, i) => (
                <button
                  key={`${p.lat},${p.lng},${i}`}
                  type="button"
                  onClick={() => pickPlace(p)}
                  className="block w-full border-b border-border px-4 py-2.5 text-left last:border-0 transition hover:bg-popcorn-50"
                >
                  <div className="text-sm font-medium text-butter-900">{p.name || p.displayName}</div>
                  <div className="truncate text-xs text-butter-500">{p.address || p.displayName}</div>
                </button>
              ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-butter-500">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={locating}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-butter-800 transition hover:border-popcorn-400 hover:bg-popcorn-50 disabled:opacity-60"
      >
        <LocateFixed className="h-4 w-4" />
        {locating ? 'Getting your location…' : "Use my current location (I'm here now)"}
      </button>
      {error && <p className="text-sm text-berry-600">{error}</p>}
    </div>
  )
}
