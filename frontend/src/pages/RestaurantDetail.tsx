import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, MapPin, Star } from 'lucide-react'
import {
  apiGet,
  apiPatch,
  googleMapsUrl,
  ApiError,
  RATING_KEYS,
  type Restaurant,
  type ReviewsResponse,
  type ReviewListItem,
  type MyReview,
} from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useLocation } from '../context/LocationContext'
import { distanceKm, formatDistance } from '../lib/geo'
import { StarRating } from '../components/StarRating'
import { ReviewForm } from '../components/ReviewForm'
import { StaticMap } from '../components/StaticMap'
import { ReportButton } from '../components/ReportButton'
import { LocationPicker, type LocationValue } from '../components/LocationPicker'
import { Container } from '../components/ui/container'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'

export default function RestaurantDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { coords: geoCoords } = useLocation()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading')
  const [reviews, setReviews] = useState<ReviewsResponse | null>(null)
  const [myReview, setMyReview] = useState<MyReview | null>(null)

  const loadReviews = useCallback(async () => {
    if (!id) return
    const data = await apiGet<ReviewsResponse>(`/restaurants/${id}/reviews`)
    setReviews(data)
    if (user) {
      try {
        const { review } = await apiGet<{ review: MyReview | null }>(`/restaurants/${id}/my-review`)
        setMyReview(review)
      } catch {
        setMyReview(null)
      }
    }
  }, [id, user])

  useEffect(() => {
    if (!id) return
    apiGet<{ restaurant: Restaurant }>(`/restaurants/${id}`)
      .then((r) => {
        setRestaurant(r.restaurant)
        setStatus('ready')
        return loadReviews()
      })
      .catch((e) => setStatus(e instanceof ApiError && e.status === 404 ? 'notfound' : 'error'))
  }, [id, loadReviews])

  const origin = useMemo(() => {
    if (geoCoords) return geoCoords
    if (user?.lat != null && user?.lng != null) return { lat: user.lat, lng: user.lng }
    return null
  }, [geoCoords, user?.lat, user?.lng])
  const distance = restaurant ? distanceKm(origin, restaurant) : null

  return (
    <Container className="py-8">
      <Link
        to="/restaurants"
        className="inline-flex items-center gap-1 text-sm font-medium text-butter-600 hover:text-butter-900"
      >
        <ChevronLeft className="h-4 w-4" /> Back to places
      </Link>

      {status === 'loading' && <p className="mt-8 text-butter-500">Loading…</p>}
      {status === 'notfound' && <p className="mt-8 text-butter-700">That restaurant doesn’t exist.</p>}
      {status === 'error' && <p className="mt-8 text-berry-600">Something went wrong.</p>}

      {status === 'ready' && restaurant && (
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-8 lg:col-span-2">
            <header>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-3xl font-semibold text-butter-900 sm:text-4xl">
                    {restaurant.name}
                  </h1>
                  {restaurant.address && (
                    <p className="mt-1.5 text-butter-600">{restaurant.address}</p>
                  )}
                </div>
                {reviews?.summary.averageRating != null && (
                  <div className="flex items-center gap-2 rounded-2xl bg-popcorn-100 px-4 py-2.5">
                    <Star className="h-5 w-5 fill-popcorn-400 text-popcorn-500" />
                    <span className="text-2xl font-bold text-butter-900">
                      {reviews.summary.averageRating}
                    </span>
                    <span className="text-xs text-butter-600">
                      {reviews.summary.count} review{reviews.summary.count === 1 ? '' : 's'}
                    </span>
                  </div>
                )}
              </div>

              {restaurant.cuisineTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {restaurant.cuisineTags.map((t) => (
                    <Badge key={t} variant="default">{t}</Badge>
                  ))}
                </div>
              )}
            </header>

            {/* Backfill: older entries have no coords */}
            {user && restaurant.lat == null && (
              <SetLocationPanel restaurant={restaurant} onSet={setRestaurant} />
            )}

            {/* Write / edit review */}
            <section>
              {user ? (
                <ReviewForm
                  restaurantId={restaurant.id}
                  existing={myReview}
                  onSaved={loadReviews}
                  onDeleted={() => {
                    setMyReview(null)
                    loadReviews()
                  }}
                />
              ) : (
                <Card className="p-6 text-center text-butter-700">
                  <Link to="/login" className="font-semibold text-berry-600 hover:underline">Sign in</Link>{' '}
                  to write a review.
                </Card>
              )}
            </section>

            {/* Reviews */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-butter-500">
                Reviews {reviews && `(${reviews.reviews.length})`}
              </h2>
              {reviews && reviews.reviews.length === 0 && (
                <p className="mt-3 text-butter-500">No public reviews yet — be the first.</p>
              )}
              <div className="mt-4 space-y-4">
                {reviews?.reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="overflow-hidden p-0">
              {restaurant.lat != null && restaurant.lng != null ? (
                <StaticMap place={restaurant} className="h-48 w-full rounded-none border-0 shadow-none" />
              ) : (
                <div className="flex h-32 w-full items-center justify-center bg-popcorn-100 text-butter-500">
                  No map location yet
                </div>
              )}
              <div className="space-y-3 p-5">
                {distance != null && (
                  <p className="inline-flex items-center gap-1.5 text-sm font-medium text-butter-700">
                    <MapPin className="h-4 w-4 text-berry-500" /> {formatDistance(distance)} away
                  </p>
                )}
                <a href={googleMapsUrl(restaurant)} target="_blank" rel="noreferrer" className="block">
                  <Button variant="secondary" className="w-full">
                    <MapPin className="h-4 w-4" /> Open in Google Maps
                  </Button>
                </a>
                <div className="flex justify-center pt-1">
                  <ReportButton targetType="restaurant" targetId={restaurant.id} label="Report this place" />
                </div>
              </div>
            </Card>
          </aside>
        </div>
      )}
    </Container>
  )
}

/** Lets a signed-in user set a missing location (backfill for older entries). */
function SetLocationPanel({
  restaurant,
  onSet,
}: {
  restaurant: Restaurant
  onSet: (r: Restaurant) => void
}) {
  const [val, setVal] = useState<LocationValue>({ address: restaurant.address ?? '', lat: null, lng: null })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasLocation = val.lat != null && val.lng != null

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const { restaurant: updated } = await apiPatch<{ restaurant: Restaurant }>(
        `/restaurants/${restaurant.id}/location`,
        { lat: val.lat, lng: val.lng, address: val.address || undefined },
      )
      onSet(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save location')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-dashed border-popcorn-400 bg-popcorn-50 p-5">
      <p className="font-semibold text-butter-900">📍 This place has no map location yet</p>
      <p className="mt-0.5 text-sm text-butter-700">
        Set its exact spot so it shows on the map and in distance filters.
      </p>
      <div className="mt-4">
        <LocationPicker value={val} onChange={(v) => setVal(v)} mapName={restaurant.name} />
      </div>
      {error && <p className="mt-2 text-sm text-berry-600">{error}</p>}
      {hasLocation && (
        <Button onClick={save} disabled={saving} size="sm" className="mt-4">
          {saving ? 'Saving…' : 'Save location'}
        </Button>
      )}
    </Card>
  )
}

function ReviewCard({ review }: { review: ReviewListItem }) {
  const g = review.generic
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2.5">
        {review.reviewer.avatarUrl ? (
          <img src={review.reviewer.avatarUrl} alt="" className="h-9 w-9 rounded-full" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-popcorn-200 text-sm font-bold text-butter-700">
            {(review.reviewer.name ?? 'P').charAt(0).toUpperCase()}
          </div>
        )}
        <span className="font-semibold text-butter-900">{review.reviewer.name ?? 'Popcorn fan'}</span>
        {review.isOwner && <Badge variant="default">You</Badge>}
        {review.isOwner && g && !g.isPublic && <Badge variant="secondary">Private</Badge>}
        {!review.isOwner && (
          <div className="ml-auto">
            <ReportButton targetType="review" targetId={review.id} />
          </div>
        )}
      </div>

      {g && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2">
            {RATING_KEYS.map((key) =>
              g.ratings[key] != null ? (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm capitalize text-butter-600">{key}</span>
                  <StarRating value={g.ratings[key]} size="sm" />
                </div>
              ) : null,
            )}
          </div>
          {g.textReview && <p className="mt-4 text-[15px] leading-relaxed text-butter-900">{g.textReview}</p>}
        </>
      )}

      {review.favouriteItems && review.favouriteItems.items.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-butter-500">Favourite items</div>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {review.favouriteItems.items.map((it) => (
              <li key={it.id} className="flex items-center gap-2 rounded-xl border border-border bg-butter-50 px-2.5 py-1.5">
                {it.photoUrl && <img src={it.photoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />}
                <span className="text-sm font-medium text-butter-900">{it.itemName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
