import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Centres content and caps width, but uses the full canvas on desktop. */
export function Container({
  className,
  size = 'default',
  ...props
}: HTMLAttributes<HTMLDivElement> & { size?: 'default' | 'narrow' | 'wide' }) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        size === 'narrow' && 'max-w-3xl',
        size === 'default' && 'max-w-7xl',
        size === 'wide' && 'max-w-[88rem]',
        className,
      )}
      {...props}
    />
  )
}
