import { useRef, useState } from 'react'
import { Plus, X, ImagePlus } from 'lucide-react'
import type { FavouriteItem } from '../lib/api'
import { Input } from './ui/input'
import { Badge } from './ui/badge'

export interface DraftItem {
  tempId: string
  itemName: string
  note: string
  file: File | null
  previewUrl: string | null
}

/**
 * Favourite-items editor. Controlled: the parent (ReviewForm) owns both the
 * saved `persistedItems` and unsaved `drafts`, so items are added alongside a
 * new review and committed together on one Save.
 */
export function FavouriteItems({
  persistedItems,
  drafts,
  onAddDraft,
  onRemoveDraft,
  onRemovePersisted,
}: {
  persistedItems: FavouriteItem[]
  drafts: DraftItem[]
  onAddDraft: (d: DraftItem) => void
  onRemoveDraft: (tempId: string) => void
  onRemovePersisted: (id: string) => void
}) {
  const [itemName, setItemName] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function add() {
    if (!itemName.trim()) {
      setError('Item name is required')
      return
    }
    onAddDraft({
      tempId: crypto.randomUUID(),
      itemName: itemName.trim(),
      note: note.trim(),
      file,
      previewUrl: file ? URL.createObjectURL(file) : null,
    })
    setItemName('')
    setNote('')
    setFile(null)
    if (fileInput.current) fileInput.current.value = ''
    setError(null)
  }

  const hasAny = persistedItems.length > 0 || drafts.length > 0

  return (
    <div className="mt-5 border-t border-border pt-5">
      <h4 className="text-sm font-semibold text-butter-900">Favourite items</h4>
      <p className="text-xs text-butter-500">
        Dishes you loved — add them right here. Photos are compressed automatically.
      </p>

      {hasAny && (
        <ul className="mt-3 space-y-2">
          {persistedItems.map((it) => (
            <li key={it.id} className="flex items-center gap-3 rounded-xl border border-border bg-butter-50 px-3 py-2">
              {it.photoUrl && <img src={it.photoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-butter-900">{it.itemName}</div>
                {it.note && <div className="truncate text-xs text-butter-500">{it.note}</div>}
              </div>
              <IconRemove onClick={() => onRemovePersisted(it.id)} />
            </li>
          ))}
          {drafts.map((d) => (
            <li key={d.tempId} className="flex items-center gap-3 rounded-xl border border-dashed border-popcorn-400 bg-popcorn-50 px-3 py-2">
              {d.previewUrl && <img src={d.previewUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate text-sm font-medium text-butter-900">
                  {d.itemName}
                  <Badge variant="default">unsaved</Badge>
                </div>
                {d.note && <div className="truncate text-xs text-butter-500">{d.note}</div>}
              </div>
              <IconRemove onClick={() => onRemoveDraft(d.tempId)} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 space-y-2 rounded-xl bg-butter-50 p-3">
        <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Item name (e.g. Caramel bucket)" />
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-white px-4 py-1.5 text-sm font-medium text-butter-700 transition hover:border-popcorn-400">
            <ImagePlus className="h-4 w-4" />
            {file ? 'Change photo' : 'Add photo'}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
          {file && <span className="truncate text-xs text-butter-500">{file.name}</span>}
          <button
            type="button"
            onClick={add}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-berry-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-berry-600"
          >
            <Plus className="h-4 w-4" /> Add item
          </button>
        </div>
        {error && <p className="text-sm text-berry-600">{error}</p>}
      </div>
    </div>
  )
}

function IconRemove({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove item"
      className="flex h-7 w-7 items-center justify-center rounded-full text-butter-500 transition hover:bg-berry-50 hover:text-berry-600"
    >
      <X className="h-4 w-4" />
    </button>
  )
}
