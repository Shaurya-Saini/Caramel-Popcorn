import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Popcorn-themed button. One primary style (buttery pill) and a small set of
 * supporting variants. Exported `buttonVariants` lets <Link>s share the look.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition ' +
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-popcorn-200/70 ' +
    'disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-popcorn-500 text-butter-900 shadow-sm hover:bg-popcorn-400 hover:shadow-md active:translate-y-px',
        secondary:
          'border border-border bg-white text-butter-800 shadow-sm hover:border-popcorn-400 hover:bg-popcorn-50',
        accent:
          'bg-berry-500 text-white shadow-sm hover:bg-berry-600 active:translate-y-px',
        outline:
          'border-2 border-berry-500 text-berry-600 hover:bg-berry-50',
        ghost: 'text-butter-700 hover:bg-butter-100',
        link: 'text-berry-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        default: 'h-11 px-6 text-[15px]',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
