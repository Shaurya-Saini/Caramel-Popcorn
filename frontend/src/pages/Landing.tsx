import { Link } from 'react-router-dom'
import { Star, MapPin, Heart, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Container } from '../components/ui/container'
import { cn } from '@/lib/utils'
import { buttonVariants } from '../components/ui/button'

const CUISINES = ['Pizza', 'Biryani', 'Sushi', 'Cafe', 'Street food', 'Desserts']

const FEATURES = [
  {
    icon: Star,
    title: 'Rate what matters',
    body: 'Score food, service, price and ambiance separately — not one blurry star.',
  },
  {
    icon: Heart,
    title: 'Tag your favourite bites',
    body: 'Save the exact dishes you loved, with photos, tied to your taste profile.',
  },
  {
    icon: MapPin,
    title: 'Find the right branch',
    body: 'Pin the exact spot, see distance from you, and open it in Maps in one tap.',
  },
]

export default function Landing() {
  const { user } = useAuth()

  return (
    <div>
      {/* Hero — full-bleed warm gradient, the most popcorn thing on the page */}
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#FFD23F_0%,#F98A28_46%,#EC3A3A_100%)]">
        <Container className="relative flex flex-col items-center py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            A brighter way to remember good food
          </span>

          <h1 className="mt-6 max-w-4xl font-display text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Find your next
            <br />
            <span className="text-popcorn-100">favourite bite</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-white/90">
            Log restaurant visits, rate them across the things that matter, and share the
            dishes worth ordering again — wrapped in a bright popcorn world.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/restaurants"
              className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-berry-600 shadow-lg shadow-berry-700/20 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Explore places
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm font-semibold text-white/70">Popular:</span>
            {CUISINES.map((c) => (
              <Link
                key={c}
                to="/restaurants"
                className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"
              >
                {c}
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Feature band */}
      <Container className="py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold text-butter-900 sm:text-4xl">
            Reviews with actual flavour
          </h2>
          <p className="mt-3 text-butter-700">
            Two independent parts — your ratings and your favourite dishes — each with its own
            privacy toggle. Share the ratings, keep the secret order to yourself.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-popcorn-100 text-popcorn-700">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-butter-900">{f.title}</h3>
              <p className="mt-2 text-butter-700">{f.body}</p>
            </div>
          ))}
        </div>

        {/* Closing CTA */}
        <div className="mt-14 overflow-hidden rounded-3xl bg-butter-900 px-8 py-12 text-center sm:px-12">
          <h2 className="font-display text-3xl font-semibold text-popcorn-100 sm:text-4xl">
            Got a place you love?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-butter-100/80">
            Add it to the shared map, drop a review, and help someone find their next great meal.
          </p>
          <Link
            to={user ? '/restaurants/new' : '/login'}
            className={cn(buttonVariants({ variant: 'primary', size: 'lg' }), 'mt-7')}
          >
            {user ? 'Add a restaurant' : 'Sign in to start'}
          </Link>
        </div>
      </Container>
    </div>
  )
}
