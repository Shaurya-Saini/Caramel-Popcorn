import { useState } from 'react'
import {
  apiPost,
  apiPatch,
  apiDelete,
  RATING_KEYS,
  type MyReview,
  type Ratings,
  type RatingKey,
} from '../lib/api'
import { StarRating } from './StarRating'
import { FavouriteItems } from './FavouriteItems'

interface Props {
  restaurantId: string
  existing: MyReview | null
  onSaved: () => void
  onDeleted: () => void
}

const LABELS: Record<RatingKey, string> = {
  food: 'Food',
  service: 'Service',
  price: 'Price',
  ambiance: 'Ambiance',
}

export function ReviewForm({ restaurantId, existing, onSaved, onDeleted }: Props) {
  const [ratings, setRatings] = useState<Ratings>(
    existing?.ratings ?? { food: null, service: null, price: null, ambiance: null }
  )
  const [textReview, setTextReview] = useState(existing?.textReview ?? '')
  const [isPublic, setIsPublic] = useState(existing?.isPublicGeneric ?? true)
  const [itemsPublic, setItemsPublic] = useState(existing?.isPublicItems ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setRating(key: RatingKey, v: number) {
    setRatings((r) => ({ ...r, [key]: v }))
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const payload = {
        ratings,
        textReview: textReview.trim() || null,
        isPublicGeneric: isPublic,
        isPublicItems: itemsPublic,
      }
      if (existing) {
        await apiPatch(`/reviews/${existing.id}`, payload)
      } else {
        await apiPost('/reviews', { restaurantId, ...payload })
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!existing) return
    setBusy(true)
    try {
      await apiDelete(`/reviews/${existing.id}`)
      onDeleted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-butter-100 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-butter-900">
        {existing ? 'Your review' : 'Write a review'}
      </h3>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {RATING_KEYS.map((key) => (
          <div key={key} className="flex items-center justify-between gap-2">
            <span className="text-sm text-butter-700">{LABELS[key]}</span>
            <StarRating value={ratings[key]} onChange={(v) => setRating(key, v)} />
          </div>
        ))}
      </div>

      <textarea
        value={textReview}
        onChange={(e) => setTextReview(e.target.value)}
        placeholder="How was it? (optional)"
        rows={3}
        className="input mt-4 resize-y"
      />

      <div className="mt-4 space-y-2">
        <label className="flex items-center gap-2 text-sm text-butter-700">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 accent-popcorn-500"
          />
          Show my ratings &amp; review publicly
        </label>
        <label className="flex items-center gap-2 text-sm text-butter-700">
          <input
            type="checkbox"
            checked={itemsPublic}
            onChange={(e) => setItemsPublic(e.target.checked)}
            className="h-4 w-4 accent-popcorn-500"
          />
          Show my favourite items publicly
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-berry-600">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-full bg-popcorn-500 px-5 py-2 font-semibold text-butter-900 shadow-sm transition hover:bg-popcorn-400 disabled:opacity-60"
        >
          {busy ? 'Saving…' : existing ? 'Update review' : 'Post review'}
        </button>
        {existing && (
          <button
            onClick={remove}
            disabled={busy}
            className="text-sm font-medium text-berry-600 hover:underline"
          >
            Delete
          </button>
        )}
      </div>

      {/* Favourite items live on a saved review. */}
      {existing ? (
        <FavouriteItems reviewId={existing.id} />
      ) : (
        <p className="mt-5 border-t border-butter-100 pt-4 text-xs text-butter-500">
          Save your review first, then you can add favourite items with photos.
        </p>
      )}
    </div>
  )
}
