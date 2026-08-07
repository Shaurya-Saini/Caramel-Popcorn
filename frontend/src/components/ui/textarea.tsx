import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-xl border border-input bg-white px-4 py-3 text-[15px] text-butter-900 shadow-sm outline-none transition',
        'placeholder:text-butter-400 focus:border-popcorn-400 focus:ring-4 focus:ring-popcorn-200/60',
        className,
      )}
      {...props}
    />
  )
}
