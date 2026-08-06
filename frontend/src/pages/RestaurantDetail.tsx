import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  apiGet,
  googleMapsUrl,
  ApiError,
  RATING_KEYS,
  type Restaurant,
  type ReviewsResponse,
  type ReviewListItem,
  type MyReview,
} from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { StarRating } from '../components/StarRating'
import { ReviewForm } from '../components/ReviewForm'

export default function RestaurantDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
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

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-xl">
        <Link to="/restaurants" className="text-sm text-butter-500 hover:underline">
          ← Back to places
        </Link>

        {status === 'loading' && <p className="mt-6 text-butter-500">Loading…</p>}
        {status === 'notfound' && <p className="mt-6 text-butter-700">That restaurant doesn’t exist.</p>}
        {status === 'error' && <p className="mt-6 text-berry-600">Something went wrong.</p>}

        {status === 'ready' && restaurant && (
          <div className="mt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-butter-900">{restaurant.name}</h1>
                {restaurant.address && <p className="mt-1 text-butter-700">{restaurant.address}</p>}
              </div>
              {reviews?.summary.averageRating != null && (
                <div className="shrink-0 rounded-xl bg-popcorn-100 px-3 py-2 text-center">
                  <div className="text-lg font-bold text-butter-900">
                    {reviews.summary.averageRating}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-butter-500">
                    {reviews.summary.count} review{reviews.summary.count === 1 ? '' : 's'}
                  </div>
                </div>
              )}
            </div>

            {restaurant.cuisineTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {restaurant.cuisineTags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-popcorn-100 px-2.5 py-0.5 text-xs font-medium text-butter-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <a
              href={googleMapsUrl(restaurant)}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-butter-100 bg-white px-5 py-2.5 font-medium text-butter-900 shadow-sm transition hover:border-popcorn-400"
            >
              📍 Open in Google Maps
            </a>

            {/* Review form (signed-in only) */}
            <section className="mt-8">
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
                <div className="rounded-xl border border-dashed border-butter-100 bg-white/60 px-5 py-6 text-center text-sm text-butter-700">
                  <Link to="/login" className="font-semibold text-berry-600 hover:underline">
                    Sign in
                  </Link>{' '}
                  to write a review.
                </div>
              )}
            </section>

            {/* Reviews list */}
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-butter-500">
                Reviews
              </h2>
              {reviews && reviews.reviews.length === 0 && (
                <p className="mt-3 text-sm text-butter-500">No public reviews yet.</p>
              )}
              <ul className="mt-3 space-y-4">
                {reviews?.reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function ReviewCard({ review }: { review: ReviewListItem }) {
  const g = review.generic
  return (
    <li className="rounded-xl border border-butter-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {review.reviewer.avatarUrl ? (
          <img src={review.reviewer.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
        ) : (
          <div className="h-7 w-7 rounded-full bg-popcorn-200" />
        )}
        <span className="text-sm font-medium text-butter-900">
          {review.reviewer.name ?? 'Popcorn fan'}
        </span>
        {review.isOwner && (
          <span className="rounded-full bg-popcorn-100 px-2 py-0.5 text-[10px] font-semibold text-butter-700">
            You
          </span>
        )}
        {review.isOwner && g && !g.isPublic && (
          <span className="rounded-full bg-butter-100 px-2 py-0.5 text-[10px] font-semibold text-butter-700">
            Private
          </span>
        )}
      </div>

      {g && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
            {RATING_KEYS.map((key) =>
              g.ratings[key] != null ? (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs capitalize text-butter-500">{key}</span>
                  <StarRating value={g.ratings[key]} size="sm" />
                </div>
              ) : null
            )}
          </div>
          {g.textReview && <p className="mt-3 text-sm text-butter-900">{g.textReview}</p>}
        </>
      )}

      {/* Favourite items (step 4) */}
      {review.favouriteItems && review.favouriteItems.items.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-butter-500">
            Favourite items
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {review.favouriteItems.items.map((it) => (
              <li
                key={it.id}
                className="flex items-center gap-2 rounded-lg border border-butter-100 px-2 py-1"
              >
                {it.photoUrl && (
                  <img src={it.photoUrl} alt="" className="h-8 w-8 rounded object-cover" />
                )}
                <span className="text-sm text-butter-900">{it.itemName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}
