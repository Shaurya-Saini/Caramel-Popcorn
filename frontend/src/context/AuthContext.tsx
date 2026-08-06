import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { apiGet, apiPost, googleLoginUrl, type User } from '../lib/api'

interface AuthState {
  user: User | null
  loading: boolean
  login: () => void
  logout: () => Promise<void>
  setUser: (u: User) => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      const { user } = await apiGet<{ user: User }>('/auth/me')
      setUser(user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  function login() {
    // Full-page redirect into the backend-driven OAuth flow.
    window.location.href = googleLoginUrl
  }

  async function logout() {
    await apiPost('/auth/logout')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
