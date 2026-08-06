import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Landing() {
  const { user } = useAuth()

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
        {user ? (
          <Link
            to="/profile"
            className="rounded-full bg-popcorn-500 px-6 py-2.5 font-semibold text-butter-900 shadow-sm transition hover:bg-popcorn-400"
          >
            Go to your profile
          </Link>
        ) : (
          <Link
            to="/login"
            className="rounded-full bg-popcorn-500 px-6 py-2.5 font-semibold text-butter-900 shadow-sm transition hover:bg-popcorn-400"
          >
            Get started
          </Link>
        )}
        <Link
          to="/restaurants"
          className="rounded-full border-2 border-berry-500 px-6 py-2.5 font-semibold text-berry-600 transition hover:bg-berry-50"
        >
          Browse places
        </Link>
      </div>
    </div>
  )
}
