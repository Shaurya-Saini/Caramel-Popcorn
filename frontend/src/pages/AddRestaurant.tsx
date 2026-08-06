import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiPost, ApiError, type Restaurant, type RestaurantMatch } from '../lib/api'

export default function AddRestaurant() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // When set, we found possible duplicates and are asking the user to confirm.
  const [duplicates, setDuplicates] = useState<RestaurantMatch[] | null>(null)

  function buildPayload(confirmCreate: boolean) {
    return {
      name: name.trim(),
      address: address.trim() || undefined,
      cuisineTags: cuisine
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      confirmCreate,
    }
  }

  async function submit(confirmCreate: boolean) {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const { restaurant } = await apiPost<{ restaurant: Restaurant }>(
        '/restaurants',
        buildPayload(confirmCreate)
      )
      navigate(`/restaurants/${restaurant.id}`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const body = e.body as { matches?: RestaurantMatch[] }
        setDuplicates(body.matches ?? [])
      } else {
        setError(e instanceof Error ? e.message : 'Failed to add')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-xl">
        <header className="flex items-center gap-3">
          <Link to="/restaurants" className="text-2xl" aria-label="Back to places">
            🍿
          </Link>
          <h1 className="text-2xl font-bold text-butter-900">Add a restaurant</h1>
        </header>

        {/* Duplicate confirmation ("Did you mean …?") */}
        {duplicates && duplicates.length > 0 && (
          <div className="mt-6 rounded-xl border border-popcorn-400 bg-popcorn-50 p-4">
            <p className="font-semibold text-butter-900">Did you mean one of these?</p>
            <p className="text-sm text-butter-700">
              We found similar places. Pick one, or add yours anyway.
            </p>
            <ul className="mt-3 space-y-2">
              {duplicates.map((m) => (
                <li key={m.id}>
                  <Link
                    to={`/restaurants/${m.id}`}
                    className="block rounded-lg border border-butter-100 bg-white px-4 py-2 hover:border-popcorn-400"
                  >
                    <span className="font-medium text-butter-900">{m.name}</span>
                    {m.address && (
                      <span className="text-sm text-butter-500"> — {m.address}</span>
                    )}
                    {m.distanceM != null && (
                      <span className="ml-1 text-xs text-butter-500">
                        ({Math.round(m.distanceM)} m away)
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => submit(true)}
                disabled={submitting}
                className="rounded-full bg-popcorn-500 px-5 py-2 text-sm font-semibold text-butter-900 hover:bg-popcorn-400 disabled:opacity-60"
              >
                Add mine anyway
              </button>
              <button
                onClick={() => setDuplicates(null)}
                className="rounded-full border border-butter-100 bg-white px-5 py-2 text-sm font-medium text-butter-700"
              >
                Keep editing
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(false)
          }}
          className="mt-6 space-y-4"
        >
          <Field label="Name" required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Popcorn Palace"
              className="input"
            />
          </Field>
          <Field label="Address">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, city"
              className="input"
            />
          </Field>
          <Field label="Cuisine tags" hint="comma-separated, e.g. italian, pizza">
            <input
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              placeholder="italian, pizza"
              className="input"
            />
          </Field>

          {error && <p className="text-sm text-berry-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-popcorn-500 px-6 py-2.5 font-semibold text-butter-900 shadow-sm transition hover:bg-popcorn-400 disabled:opacity-60"
          >
            {submitting ? 'Checking…' : 'Add restaurant'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-butter-700">
        {label} {required && <span className="text-berry-500">*</span>}
      </span>
      {hint && <span className="ml-2 text-xs text-butter-500">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}
