import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Themed text input (matches the shared `.input` look). */
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-input bg-white px-4 py-2.5 text-[15px] text-butter-900 shadow-sm outline-none transition',
        'placeholder:text-butter-400 focus:border-popcorn-400 focus:ring-4 focus:ring-popcorn-200/60',
        'disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}
