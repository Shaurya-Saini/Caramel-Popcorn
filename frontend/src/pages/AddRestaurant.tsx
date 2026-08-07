import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, MapPin } from 'lucide-react'
import {
  apiPost,
  ApiError,
  type Restaurant,
  type RestaurantMatch,
} from '../lib/api'
import { LocationPicker, type LocationValue } from '../components/LocationPicker'
import { Container } from '../components/ui/container'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export default function AddRestaurant() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<RestaurantMatch[] | null>(null)

  const hasLocation = lat != null && lng != null

  function onLocation(v: LocationValue & { name?: string }) {
    setAddress(v.address)
    setLat(v.lat)
    setLng(v.lng)
    if (v.name && !name.trim()) setName(v.name)
  }

  function buildPayload(confirmCreate: boolean) {
    return {
      name: name.trim(),
      address: address.trim() || undefined,
      lat,
      lng,
      cuisineTags: cuisine.split(',').map((t) => t.trim()).filter(Boolean),
      confirmCreate,
    }
  }

  async function submit(confirmCreate: boolean) {
    if (!name.trim()) return setError('Name is required')
    if (!hasLocation) return setError('Pick the exact location (search or use your current location)')
    setSubmitting(true)
    setError(null)
    try {
      const { restaurant } = await apiPost<{ restaurant: Restaurant }>('/restaurants', buildPayload(confirmCreate))
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
    <Container size="narrow" className="py-10">
      <Link to="/restaurants" className="inline-flex items-center gap-1 text-sm font-medium text-butter-600 hover:text-butter-900">
        <ChevronLeft className="h-4 w-4" /> Back to places
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold text-butter-900">Add a restaurant</h1>
      <p className="mt-1 text-butter-700">Pin the exact branch — it keeps reviews and recommendations accurate.</p>

      {/* Duplicate confirmation */}
      {duplicates && duplicates.length > 0 && (
        <Card className="mt-6 border-popcorn-400 bg-popcorn-50 p-5">
          <p className="font-semibold text-butter-900">Did you mean one of these?</p>
          <p className="text-sm text-butter-700">We found similar nearby places. Pick one to review it, or add yours anyway.</p>
          <ul className="mt-3 space-y-2">
            {duplicates.map((m) => (
              <li key={m.id}>
                <Link to={`/restaurants/${m.id}`} className="block rounded-xl border border-border bg-white px-4 py-2.5 transition hover:border-popcorn-400">
                  <span className="font-medium text-butter-900">{m.name}</span>
                  {m.address && <span className="text-sm text-butter-500"> — {m.address}</span>}
                  {m.distanceM != null && (
                    <span className="ml-1 text-xs text-butter-500">
                      ({m.distanceM < 1000 ? `${Math.round(m.distanceM)} m` : `${(m.distanceM / 1000).toFixed(1)} km`} away)
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-3">
            <Button size="sm" onClick={() => submit(true)} disabled={submitting}>Add mine anyway</Button>
            <Button size="sm" variant="secondary" onClick={() => setDuplicates(null)}>Keep editing</Button>
          </div>
        </Card>
      )}

      <Card className="mt-6 p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(false)
          }}
          className="space-y-6"
        >
          <div>
            <Label htmlFor="name">Name <span className="text-berry-500">*</span></Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Domino's Pizza — Gandhi Nagar"
              className="mt-1.5"
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-berry-500" />
              <Label>Location <span className="text-berry-500">*</span></Label>
            </div>
            <p className="mt-0.5 text-xs text-butter-500">Pin the exact branch so reviews aren’t mixed up between locations.</p>
            <div className="mt-2">
              <LocationPicker value={{ address, lat, lng }} onChange={onLocation} mapName={name} />
            </div>
          </div>

          <div>
            <Label htmlFor="cuisine">Cuisine tags <span className="ml-1 font-normal text-butter-500">comma-separated</span></Label>
            <Input
              id="cuisine"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              placeholder="italian, pizza"
              className="mt-1.5"
            />
          </div>

          {error && <p className="text-sm text-berry-600">{error}</p>}

          <Button type="submit" disabled={submitting}>{submitting ? 'Checking…' : 'Add restaurant'}</Button>
        </form>
      </Card>
    </Container>
  )
}
