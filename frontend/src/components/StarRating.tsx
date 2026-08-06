interface StarRatingProps {
  value: number | null
  onChange?: (v: number) => void
  size?: 'sm' | 'md'
}

/** 0–5 star rating. Interactive when `onChange` is provided, else read-only. */
export function StarRating({ value, onChange, size = 'md' }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5]
  const cls = size === 'sm' ? 'text-sm' : 'text-xl'
  const filled = value ?? 0

  return (
    <div className={`inline-flex items-center gap-0.5 ${cls}`}>
      {stars.map((n) => {
        const on = n <= filled
        const star = (
          <span className={on ? 'text-popcorn-500' : 'text-butter-100'}>★</span>
        )
        return onChange ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="leading-none transition hover:scale-110"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            {star}
          </button>
        ) : (
          <span key={n} className="leading-none">
            {star}
          </span>
        )
      })}
    </div>
  )
}
