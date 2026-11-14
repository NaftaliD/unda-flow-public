import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Native select (keeps mobile pickers and RTL behaviour for free). */
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-pill border border-border bg-background px-4 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
      {...props}
    />
  )
}
