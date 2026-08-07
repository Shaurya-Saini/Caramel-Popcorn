import { useEffect, useState } from 'react'
import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  apiUpload,
  RATING_KEYS,
  type MyReview,
  type Ratings,
  type RatingKey,
  type FavouriteItem,
} from '../lib/api'
import { StarRating } from './StarRating'
import { FavouriteItems, type DraftItem } from './FavouriteItems'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'

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

  const [persistedItems, setPersistedItems] = useState<FavouriteItem[]>([])
  const [drafts, setDrafts] = useState<DraftItem[]>([])

  useEffect(() => {
    if (existing) {
      apiGet<{ items: FavouriteItem[] }>(`/reviews/${existing.id}/items`)
        .then((r) => setPersistedItems(r.items))
        .catch(() => setPersistedItems([]))
    } else {
      setPersistedItems([])
    }
  }, [existing])

  useEffect(() => {
    return () => drafts.forEach((d) => d.previewUrl && URL.revokeObjectURL(d.previewUrl))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setRating(key: RatingKey, v: number) {
    setRatings((r) => ({ ...r, [key]: v }))
  }
  function addDraft(d: DraftItem) {
    setDrafts((prev) => [...prev, d])
  }
  function removeDraft(tempId: string) {
    setDrafts((prev) => {
      const d = prev.find((x) => x.tempId === tempId)
      if (d?.previewUrl) URL.revokeObjectURL(d.previewUrl)
      return prev.filter((x) => x.tempId !== tempId)
    })
  }
  async function removePersisted(id: string) {
    try {
      await apiDelete(`/items/${id}`)
      setPersistedItems((prev) => prev.filter((i) => i.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove item')
    }
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
      let reviewId = existing?.id
      if (existing) {
        await apiPatch(`/reviews/${existing.id}`, payload)
      } else {
        const { review } = await apiPost<{ review: { id: string } }>('/reviews', {
          restaurantId,
          ...payload,
        })
        reviewId = review.id
      }
      for (const d of drafts) {
        const fd = new FormData()
        fd.append('itemName', d.itemName)
        if (d.note) fd.append('note', d.note)
        if (d.file) fd.append('photo', d.file)
        await apiUpload(`/reviews/${reviewId}/items`, fd)
      }
      drafts.forEach((d) => d.previewUrl && URL.revokeObjectURL(d.previewUrl))
      setDrafts([])
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

  const draftCount = drafts.length
  const saveLabel = busy
    ? 'Saving…'
    : existing
      ? draftCount > 0 ? `Update review + ${draftCount} item${draftCount === 1 ? '' : 's'}` : 'Update review'
      : draftCount > 0 ? `Post review + ${draftCount} item${draftCount === 1 ? '' : 's'}` : 'Post review'

  return (
    <Card className="p-5 sm:p-6">
      <h3 className="text-xl font-semibold text-butter-900">
        {existing ? 'Your review' : 'Write a review'}
      </h3>

      <div className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {RATING_KEYS.map((key) => (
          <div key={key} className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-butter-700">{LABELS[key]}</span>
            <StarRating value={ratings[key]} onChange={(v) => setRating(key, v)} />
          </div>
        ))}
      </div>

      <Textarea
        value={textReview}
        onChange={(e) => setTextReview(e.target.value)}
        placeholder="How was it? What should someone order? (optional)"
        rows={3}
        className="mt-5 resize-y"
      />

      <div className="mt-4 space-y-2.5">
        <Toggle checked={isPublic} onChange={setIsPublic} label="Show my ratings & review publicly" />
        <Toggle checked={itemsPublic} onChange={setItemsPublic} label="Show my favourite items publicly" />
      </div>

      <FavouriteItems
        persistedItems={persistedItems}
        drafts={drafts}
        onAddDraft={addDraft}
        onRemoveDraft={removeDraft}
        onRemovePersisted={removePersisted}
      />

      {error && <p className="mt-3 text-sm text-berry-600">{error}</p>}

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={save} disabled={busy}>{saveLabel}</Button>
        {existing && (
          <Button onClick={remove} disabled={busy} variant="ghost" className="text-berry-600 hover:bg-berry-50">
            Delete
          </Button>
        )}
      </div>
    </Card>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-butter-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded accent-popcorn-500"
      />
      {label}
    </label>
  )
}
