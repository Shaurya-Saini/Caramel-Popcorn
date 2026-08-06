import { useEffect, useRef, useState } from 'react'
import { apiGet, apiUpload, apiDelete, type FavouriteItem } from '../lib/api'

/** Manage the favourite items on the user's own review (list / add / delete). */
export function FavouriteItems({ reviewId }: { reviewId: string }) {
  const [items, setItems] = useState<FavouriteItem[]>([])
  const [itemName, setItemName] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  async function load() {
    try {
      const { items } = await apiGet<{ items: FavouriteItem[] }>(`/reviews/${reviewId}/items`)
      setItems(items)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId])

  async function add() {
    if (!itemName.trim()) {
      setError('Item name is required')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('itemName', itemName.trim())
      if (note.trim()) fd.append('note', note.trim())
      if (file) fd.append('photo', file)
      await apiUpload(`/reviews/${reviewId}/items`, fd)
      setItemName('')
      setNote('')
      setFile(null)
      if (fileInput.current) fileInput.current.value = ''
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add item')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    await apiDelete(`/items/${id}`)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div className="mt-5 border-t border-butter-100 pt-4">
      <h4 className="text-sm font-semibold text-butter-900">Favourite items</h4>
      <p className="text-xs text-butter-500">
        Dishes you loved. Photos are compressed automatically.
      </p>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-3 rounded-lg border border-butter-100 px-3 py-2"
            >
              {it.photoUrl && (
                <img src={it.photoUrl} alt="" className="h-10 w-10 rounded object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-butter-900">{it.itemName}</div>
                {it.note && <div className="truncate text-xs text-butter-500">{it.note}</div>}
              </div>
              <button
                onClick={() => remove(it.id)}
                className="text-xs font-medium text-berry-600 hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 space-y-2 rounded-lg bg-popcorn-50 p-3">
        <input
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="Item name (e.g. Caramel bucket)"
          className="input"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="input"
        />
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-butter-700 file:mr-3 file:rounded-full file:border-0 file:bg-popcorn-500 file:px-4 file:py-1.5 file:font-semibold file:text-butter-900"
        />
        {error && <p className="text-sm text-berry-600">{error}</p>}
        <button
          onClick={add}
          disabled={busy}
          className="rounded-full bg-berry-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-berry-600 disabled:opacity-60"
        >
          {busy ? 'Adding…' : '+ Add item'}
        </button>
      </div>
    </div>
  )
}
