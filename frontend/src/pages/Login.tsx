import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Card } from '../components/ui/card'

const ERRORS: Record<string, string> = {
  oauth_state: 'Your login session expired. Please try again.',
  oauth_failed: 'Google sign-in didn’t go through. Please try again.',
}

export default function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const error = params.get('error')

  // Already signed in → skip the login page.
  useEffect(() => {
    if (!loading && user) navigate('/profile', { replace: true })
  }, [loading, user, navigate])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="flex items-center gap-2" aria-label="Caramel Popcorn home">
        <span className="font-display text-2xl font-bold tracking-tight text-butter-900">
          Caramel <span className="text-popcorn-600">Popcorn</span>
        </span>
      </Link>

      <Card className="mt-8 w-full max-w-sm p-8 text-center">
        <h1 className="font-display text-2xl font-semibold text-butter-900">Welcome back</h1>
        <p className="mt-2 text-butter-700">Sign in to rate places and save your favourite bites.</p>

        {error && (
          <p className="mt-5 rounded-xl bg-berry-50 px-4 py-2.5 text-sm font-medium text-berry-700">
            {ERRORS[error] ?? 'Something went wrong. Please try again.'}
          </p>
        )}

        <button
          onClick={login}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-border bg-white px-6 py-3 font-semibold text-butter-900 shadow-sm transition hover:border-popcorn-400 hover:bg-popcorn-50"
        >
          <GoogleGlyph />
          Continue with Google
        </button>
      </Card>

      <Link to="/" className="mt-6 text-sm font-medium text-butter-600 hover:text-butter-900">
        ← Back to home
      </Link>
    </div>
  )
}

function GoogleGlyph() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.3 7.4 24 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4c-.2-.7-.4-1.4-.4-2.4s.1-1.7.4-2.4V6.5H1.4C.5 8.2 0 10 0 12s.5 3.8 1.4 5.5l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.5l4 3.1C6.3 6.8 8.9 4.8 12 4.8z" />
    </svg>
  )
}
