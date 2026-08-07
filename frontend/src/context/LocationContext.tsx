import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Coords } from '../lib/geo'

type GeoStatus =
  | 'idle' // not requested yet
  | 'prompting' // waiting on the browser permission dialog / fix
  | 'granted' // we have live browser coords
  | 'denied' // user declined browser geolocation
  | 'unavailable' // geolocation unsupported or errored

interface LocationState {
  /** Live browser coordinates, or null if we don't have them. */
  coords: Coords | null
  status: GeoStatus
  /** Ask the browser for location again (e.g. from a button after a denial). */
  request: () => void
}

const LocationContext = createContext<LocationState | undefined>(undefined)

/**
 * Requests browser geolocation once on load (Content.md §2.3). If granted we
 * expose live coords; if denied/unavailable the app falls back to the profile's
 * manual location (handled by consumers). Non-persistent, in-memory only.
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  const [coords, setCoords] = useState<Coords | null>(null)
  const [status, setStatus] = useState<GeoStatus>('idle')

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable')
      return
    }
    setStatus('prompting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus('granted')
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  }, [])

  // Request on load — but only actually prompt if permission isn't already
  // denied (avoids a pointless prompt when the user has said no before).
  useEffect(() => {
    const perms = navigator.permissions
    if (perms?.query) {
      perms
        .query({ name: 'geolocation' as PermissionName })
        .then((res) => {
          if (res.state === 'denied') setStatus('denied')
          else request()
        })
        .catch(() => request())
    } else {
      request()
    }
  }, [request])

  return (
    <LocationContext.Provider value={{ coords, status, request }}>
      {children}
    </LocationContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocation() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation must be used within LocationProvider')
  return ctx
}
