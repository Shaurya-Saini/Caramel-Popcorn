import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiGet, apiPatch, type User } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()

  const [allTags, setAllTags] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>(user?.tasteTags ?? [])
  const [manualLocation, setManualLocation] = useState(user?.manualLocation ?? '')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiGet<{ tasteTags: string[] }>('/meta/taste-tags')
      .then((r) => setAllTags(r.tasteTags))
      .catch(() => setAllTags([]))
  }, [])

  function toggleTag(tag: string) {
    setSelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const { user: updated } = await apiPatch<{ user: User }>('/users/me', {
        tasteTags: selected,
        manualLocation: manualLocation.trim() || null,
      })
      setUser(updated)
      setSavedAt(Date.now())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  if (!user) return null

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-xl">
        <header className="flex items-center justify-between">
          <Link to="/" className="text-2xl" aria-label="Home">
            🍿
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-berry-600 hover:underline"
          >
            Sign out
          </button>
        </header>

        <div className="mt-6 flex items-center gap-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-14 w-14 rounded-full border border-butter-100"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-popcorn-200" />
          )}
          <div>
            <h1 className="text-xl font-bold text-butter-900">{user.name ?? 'Popcorn fan'}</h1>
            <p className="text-sm text-butter-500">{user.email}</p>
          </div>
        </div>

        {/* Taste tags */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-butter-500">
            Taste profile
          </h2>
          <p className="mt-1 text-sm text-butter-700">Pick what you love.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {allTags.map((tag) => {
              const active = selected.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={
                    'rounded-full border px-3 py-1.5 text-sm font-medium transition ' +
                    (active
                      ? 'border-popcorn-500 bg-popcorn-500 text-butter-900'
                      : 'border-butter-100 bg-white text-butter-700 hover:border-popcorn-400')
                  }
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </section>

        {/* Manual location */}
        <section className="mt-8">
          <label
            htmlFor="manualLocation"
            className="text-sm font-semibold uppercase tracking-wide text-butter-500"
          >
            Location
          </label>
          <p className="mt-1 text-sm text-butter-700">
            Used to estimate distances if you don't share browser location.
          </p>
          <input
            id="manualLocation"
            value={manualLocation}
            onChange={(e) => setManualLocation(e.target.value)}
            placeholder="City or address"
            className="mt-3 w-full rounded-lg border border-butter-100 bg-white px-4 py-2.5 text-butter-900 outline-none focus:border-popcorn-500"
          />
        </section>

        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-popcorn-500 px-6 py-2.5 font-semibold text-butter-900 shadow-sm transition hover:bg-popcorn-400 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
          {savedAt && !saving && <span className="text-sm text-green-600">Saved ✓</span>}
          {error && <span className="text-sm text-berry-600">{error}</span>}
        </div>
      </div>
    </div>
  )
}
