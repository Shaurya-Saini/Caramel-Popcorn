import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LocateFixed, LogOut } from 'lucide-react'
import { apiGet, apiPatch, type User } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Container } from '../components/ui/container'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export default function Profile() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()

  const [allTags, setAllTags] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>(user?.tasteTags ?? [])
  const [manualLocation, setManualLocation] = useState(user?.manualLocation ?? '')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    apiGet<{ tasteTags: string[] }>('/meta/taste-tags')
      .then((r) => setAllTags(r.tasteTags))
      .catch(() => setAllTags([]))
  }, [])

  function toggleTag(tag: string) {
    setSelected((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
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

  function useCurrentLocation() {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not available in this browser')
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { user: updated } = await apiPatch<{ user: User }>('/users/me', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
          setUser(updated)
          setSavedAt(Date.now())
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not save location')
        } finally {
          setLocating(false)
        }
      },
      () => {
        setError('Could not get your location')
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  }

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  if (!user) return null

  return (
    <Container size="narrow" className="py-10">
      {/* Identity header */}
      <div className="flex items-center gap-4">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-full border border-border" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-popcorn-200 text-2xl font-bold text-butter-700">
            {(user.name ?? 'P').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold text-butter-900">
            {user.name ?? 'Popcorn fan'}
          </h1>
          <p className="truncate text-sm text-butter-500">{user.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-berry-600 hover:bg-berry-50">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>

      {/* Taste profile */}
      <Card className="mt-8 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-butter-500">Taste profile</h2>
        <p className="mt-1 text-sm text-butter-700">Pick what you love — we’ll use it to tailor recommendations.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {allTags.map((tag) => {
            const active = selected.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={
                  'rounded-full border px-3.5 py-1.5 text-sm font-medium transition ' +
                  (active
                    ? 'border-popcorn-500 bg-popcorn-500 text-butter-900 shadow-sm'
                    : 'border-border bg-white text-butter-700 hover:border-popcorn-400')
                }
              >
                {tag}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Location */}
      <Card className="mt-6 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-butter-500">Location</h2>
        <p className="mt-1 text-sm text-butter-700">Used to estimate distances if you don’t share browser location.</p>
        <Input
          value={manualLocation}
          onChange={(e) => setManualLocation(e.target.value)}
          placeholder="City or address"
          className="mt-4"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={useCurrentLocation} disabled={locating}>
            <LocateFixed className="h-4 w-4" />
            {locating ? 'Locating…' : 'Use my current location'}
          </Button>
          {user.lat != null && user.lng != null && (
            <span className="text-xs text-green-700">
              Saved: {user.lat.toFixed(3)}, {user.lng.toFixed(3)}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-butter-500">
          Saving your coordinates lets the Places list show distances even without live location.
        </p>
      </Card>

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button>
        {savedAt && !saving && <span className="text-sm font-medium text-green-700">Saved ✓</span>}
        {error && <span className="text-sm text-berry-600">{error}</span>}
      </div>
    </Container>
  )
}
