import { useEffect, useState } from 'react'
import { apiGet, type HealthResponse } from './lib/api'

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiGet<HealthResponse>('/health')
      .then(setHealth)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="text-6xl mb-4" aria-hidden="true">
        🍿
      </div>
      <h1 className="text-4xl sm:text-5xl font-bold text-butter-900 tracking-tight">
        Caramel <span className="text-popcorn-600">Popcorn</span>
      </h1>
      <p className="mt-3 max-w-md text-butter-700">
        Rate restaurants, tag your favourite bites, and share the good stuff — a
        bright little food-review corner of the web.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button className="rounded-full bg-popcorn-500 px-6 py-2.5 font-semibold text-butter-900 shadow-sm transition hover:bg-popcorn-400">
          Get started
        </button>
        <button className="rounded-full border-2 border-berry-500 px-6 py-2.5 font-semibold text-berry-600 transition hover:bg-berry-50">
          Browse places
        </button>
      </div>

      {/* Dev-only wiring check: confirms the frontend can reach the API. */}
      <div className="mt-12 rounded-xl border border-butter-100 bg-white px-5 py-3 text-sm shadow-sm">
        <span className="font-medium text-butter-700">API status: </span>
        {health ? (
          <span className="text-green-600">
            ● {health.status} · supabase {health.supabase}
          </span>
        ) : error ? (
          <span className="text-berry-600">● unreachable ({error})</span>
        ) : (
          <span className="text-butter-500">● checking…</span>
        )}
      </div>
    </div>
  )
}

export default App
