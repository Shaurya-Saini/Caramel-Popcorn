import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number | null
  onChange?: (v: number) => void
  size?: 'sm' | 'md'
}

/** 0–5 star rating. Interactive when `onChange` is provided, else read-only. */
export function StarRating({ value, onChange, size = 'md' }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5]
  const dim = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  const filled = value ?? 0

  return (
    <div className="inline-flex items-center gap-0.5">
      {stars.map((n) => {
        const on = n <= filled
        const icon = (
          <Star
            className={cn(dim, on ? 'fill-popcorn-400 text-popcorn-500' : 'fill-butter-100 text-butter-200')}
          />
        )
        return onChange ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="rounded-full leading-none transition hover:scale-110"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            {icon}
          </button>
        ) : (
          <span key={n} className="leading-none">
            {icon}
          </span>
        )
      })}
    </div>
  )
}
