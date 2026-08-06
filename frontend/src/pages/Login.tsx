import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ERRORS: Record<string, string> = {
  oauth_state: 'Login session expired. Please try again.',
  oauth_failed: 'Google sign-in failed. Please try again.',
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <Link to="/" className="text-5xl mb-6" aria-label="Home">
        🍿
      </Link>
      <h1 className="text-2xl font-bold text-butter-900">Welcome back</h1>
      <p className="mt-2 text-butter-700">Sign in to start reviewing.</p>

      {error && (
        <p className="mt-4 rounded-lg bg-berry-50 px-4 py-2 text-sm text-berry-700">
          {ERRORS[error] ?? 'Something went wrong. Please try again.'}
        </p>
      )}

      <button
        onClick={login}
        className="mt-8 flex items-center gap-3 rounded-full border border-butter-100 bg-white px-6 py-3 font-semibold text-butter-900 shadow-sm transition hover:bg-popcorn-50"
      >
        <span className="text-lg">🔑</span>
        Continue with Google
      </button>
    </div>
  )
}
