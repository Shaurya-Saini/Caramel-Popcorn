import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Star, Plus } from 'lucide-react'
import { apiGet, type Restaurant } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useLocation } from '../context/LocationContext'
import { distanceKm, formatDistance, type Coords } from '../lib/geo'
import { StaticMap } from '../components/StaticMap'
import { Container } from '../components/ui/container'
import { Badge } from '../components/ui/badge'
import { buttonVariants } from '../components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'
import { cn } from '@/lib/utils'

const ANY = '__all__'

export default function Restaurants() {
  const { user } = useAuth()
  const { coords: geoCoords, status: geoStatus, request } = useLocation()

  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [cuisine, setCuisine] = useState<string>(ANY)
  const [minRating, setMinRating] = useState<number>(0)
  const [maxDistance, setMaxDistance] = useState<number>(0)

  useEffect(() => {
    apiGet<{ restaurants: Restaurant[] }>('/restaurants')
      .then((r) => setRestaurants(r.restaurants))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [])

  const origin: Coords | null = useMemo(() => {
    if (geoCoords) return geoCoords
    if (user?.lat != null && user?.lng != null) return { lat: user.lat, lng: user.lng }
    return null
  }, [geoCoords, user?.lat, user?.lng])
  const hasLocation = origin != null

  const cuisineOptions = useMemo(() => {
    const set = new Set<string>()
    restaurants?.forEach((r) => r.cuisineTags.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [restaurants])

  const withDistance = useMemo(
    () => (restaurants ?? []).map((r) => ({ r, distance: distanceKm(origin, r) })),
    [restaurants, origin],
  )

  const visible = useMemo(() => {
    let rows = withDistance
    if (cuisine !== ANY) rows = rows.filter(({ r }) => r.cuisineTags.includes(cuisine))
    if (minRating > 0) rows = rows.filter(({ r }) => (r.avgRating ?? -1) >= minRating)
    if (maxDistance > 0)
      rows = rows.filter(({ distance }) => distance != null && distance <= maxDistance)

    // Newest first (the sort control was removed; filters do the work).
    return [...rows].sort((a, b) => b.r.createdAt.localeCompare(a.r.createdAt))
  }, [withDistance, cuisine, minRating, maxDistance])

  return (
    <Container className="py-10">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-butter-900 sm:text-4xl">Places</h1>
          <p className="mt-1 text-butter-700">
            {restaurants ? `${restaurants.length} spot${restaurants.length === 1 ? '' : 's'} the community has logged` : 'Loading the good stuff…'}
          </p>
        </div>
        {user && (
          <Link to="/restaurants/new" className={cn(buttonVariants({ variant: 'primary' }))}>
            <Plus className="h-4 w-4" />
            Add restaurant
          </Link>
        )}
      </div>

      <LocationBanner
        status={geoStatus}
        hasLocation={hasLocation}
        usingProfile={!geoCoords && hasLocation}
        onRequest={request}
      />

      {/* Filters */}
      {restaurants && restaurants.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/60 p-3">
          <Select value={cuisine} onValueChange={setCuisine}>
            <SelectTrigger aria-label="Filter by cuisine" className="w-[9.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All cuisines</SelectItem>
              {cuisineOptions.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(minRating)} onValueChange={(v) => setMinRating(Number(v))}>
            <SelectTrigger aria-label="Minimum rating" className="w-[9.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any rating</SelectItem>
              <SelectItem value="3">3★ &amp; up</SelectItem>
              <SelectItem value="4">4★ &amp; up</SelectItem>
              <SelectItem value="4.5">4.5★ &amp; up</SelectItem>
            </SelectContent>
          </Select>

          {hasLocation && (
            <Select value={String(maxDistance)} onValueChange={(v) => setMaxDistance(Number(v))}>
              <SelectTrigger aria-label="Maximum distance" className="w-[9.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Any distance</SelectItem>
                <SelectItem value="1">Within 1 km</SelectItem>
                <SelectItem value="5">Within 5 km</SelectItem>
                <SelectItem value="25">Within 25 km</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {error && <p className="mt-6 text-berry-600">{error}</p>}
      {restaurants === null && !error && <GridSkeleton />}

      {restaurants?.length === 0 && (
        <EmptyState signedIn={!!user} />
      )}

      {restaurants && restaurants.length > 0 && visible.length === 0 && (
        <p className="mt-10 text-center text-butter-600">No places match those filters.</p>
      )}

      {/* Grid */}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(({ r, distance }) => (
          <Link
            key={r.id}
            to={`/restaurants/${r.id}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="relative h-40 w-full">
              {r.lat != null && r.lng != null ? (
                <StaticMap place={r} interactive={false} className="h-40 w-full rounded-none border-0 shadow-none" />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-[linear-gradient(135deg,#FFE9A8,#FFCD33)] text-5xl opacity-90">🍿</div>
              )}
              {r.avgRating != null && (
                <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-sm font-bold text-butter-900 shadow-sm backdrop-blur">
                  <Star className="h-3.5 w-3.5 fill-popcorn-400 text-popcorn-500" />
                  {r.avgRating}
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col p-5">
              <h3 className="text-lg font-semibold text-butter-900 group-hover:text-berry-600">{r.name}</h3>
              {r.address && <p className="mt-0.5 line-clamp-1 text-sm text-butter-500">{r.address}</p>}

              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                {distance != null && (
                  <Badge variant="secondary" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {formatDistance(distance)}
                  </Badge>
                )}
                {r.reviewCount != null && r.reviewCount > 0 && (
                  <span className="text-xs text-butter-500">
                    {r.reviewCount} review{r.reviewCount === 1 ? '' : 's'}
                  </span>
                )}
                {r.cuisineTags.slice(0, 3).map((t) => (
                  <Badge key={t} variant="default">{t}</Badge>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Container>
  )
}

function LocationBanner({
  status,
  hasLocation,
  usingProfile,
  onRequest,
}: {
  status: string
  hasLocation: boolean
  usingProfile: boolean
  onRequest: () => void
}) {
  if (hasLocation) {
    return (
      <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-butter-600">
        <MapPin className="h-4 w-4 text-berry-500" />
        Distances shown from {usingProfile ? 'your profile location' : 'your current location'}.
      </p>
    )
  }
  if (status === 'prompting') {
    return <p className="mt-3 text-sm text-butter-500">Getting your location…</p>
  }
  return (
    <p className="mt-3 text-sm text-butter-600">
      Share your location to see distances —{' '}
      <button onClick={onRequest} className="font-semibold text-berry-600 hover:underline">use my location</button>{' '}
      or set one on your{' '}
      <Link to="/profile" className="font-semibold text-berry-600 hover:underline">profile</Link>.
    </p>
  )
}

function EmptyState({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <div className="text-5xl">🍿</div>
      <p className="mt-4 text-lg font-semibold text-butter-900">No places yet</p>
      <p className="mt-1 text-butter-600">
        {signedIn ? 'Be the first to add one!' : 'Sign in to add the first one.'}
      </p>
      {signedIn && (
        <Link to="/restaurants/new" className={cn(buttonVariants({ variant: 'primary' }), 'mt-6')}>
          <Plus className="h-4 w-4" /> Add restaurant
        </Link>
      )}
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="h-40 w-full animate-pulse bg-butter-100" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-2/3 animate-pulse rounded bg-butter-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-butter-100" />
          </div>
        </div>
      ))}
    </div>
  )
}
