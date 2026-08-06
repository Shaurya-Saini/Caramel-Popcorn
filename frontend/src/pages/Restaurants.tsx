import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, type Restaurant } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function Restaurants() {
  const { user } = useAuth()
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiGet<{ restaurants: Restaurant[] }>('/restaurants')
      .then((r) => setRestaurants(r.restaurants))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [])

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between">
          <Link to="/" className="text-2xl" aria-label="Home">
            🍿
          </Link>
          {user && (
            <Link
              to="/restaurants/new"
              className="rounded-full bg-popcorn-500 px-4 py-2 text-sm font-semibold text-butter-900 shadow-sm transition hover:bg-popcorn-400"
            >
              + Add restaurant
            </Link>
          )}
        </header>

        <h1 className="mt-6 text-2xl font-bold text-butter-900">Places</h1>

        {error && <p className="mt-4 text-berry-600">{error}</p>}

        {restaurants === null && !error && (
          <p className="mt-6 text-butter-500">Loading…</p>
        )}

        {restaurants?.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-butter-100 bg-white/60 px-6 py-12 text-center">
            <div className="text-4xl">🍿</div>
            <p className="mt-3 font-medium text-butter-900">No places yet</p>
            <p className="mt-1 text-sm text-butter-700">
              {user ? 'Be the first to add one!' : 'Sign in to add the first one.'}
            </p>
          </div>
        )}

        <ul className="mt-6 space-y-3">
          {restaurants?.map((r) => (
            <li key={r.id}>
              <Link
                to={`/restaurants/${r.id}`}
                className="block rounded-xl border border-butter-100 bg-white px-5 py-4 shadow-sm transition hover:border-popcorn-400"
              >
                <div className="font-semibold text-butter-900">{r.name}</div>
                {r.address && <div className="text-sm text-butter-500">{r.address}</div>}
                {r.cuisineTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.cuisineTags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-popcorn-100 px-2 py-0.5 text-xs font-medium text-butter-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
