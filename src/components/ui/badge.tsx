import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// Text is always `foreground` on a fill/outline: terracotta and sage are accents, not text colours.
const badgeVariants = cva(
  'inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-semibold text-foreground',
  {
    variants: {
      tone: {
        neutral: 'bg-secondary',
        accent: 'border border-accent bg-transparent',
        outline: 'border border-border bg-transparent',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
