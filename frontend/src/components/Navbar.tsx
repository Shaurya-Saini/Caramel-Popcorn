import { Link, NavLink } from 'react-router-dom'
import { MapPin, Plus, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Container } from './ui/container'
import { buttonVariants } from './ui/button'
import { cn } from '@/lib/utils'

/** Global top navigation — brand, browse, and an auth-aware action cluster. */
export function Navbar() {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2" aria-label="Caramel Popcorn home">
          <span className="font-display text-xl font-bold tracking-tight text-butter-900">
            Caramel <span className="text-popcorn-600">Popcorn</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-2">
          <NavLink
            to="/restaurants"
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition',
                isActive
                  ? 'bg-popcorn-100 text-butter-900'
                  : 'text-butter-700 hover:bg-butter-100',
              )
            }
          >
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Places</span>
          </NavLink>

          {user?.isAdmin && (
            <NavLink
              to="/admin/reports"
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition',
                  isActive ? 'bg-popcorn-100 text-butter-900' : 'text-butter-700 hover:bg-butter-100',
                )
              }
              title="Moderation queue"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Moderation</span>
            </NavLink>
          )}

          {user ? (
            <>
              <Link
                to="/restaurants/new"
                className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'gap-1.5')}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add place</span>
              </Link>
              <Link
                to="/profile"
                className="ml-1 inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-white"
                aria-label="Your profile"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-butter-700">
                    {(user.name ?? 'P').charAt(0).toUpperCase()}
                  </span>
                )}
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className={cn(buttonVariants({ variant: 'primary', size: 'sm' }))}
            >
              Sign in
            </Link>
          )}
        </nav>
      </Container>
    </header>
  )
}
