import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Toggle button for filters and equipment pickers. */
export function Chip({
  selected,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'inline-flex h-8 items-center rounded-pill border px-3 pointer-coarse:h-10 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-transparent text-foreground hover:bg-muted',
        className,
      )}
      {...props}
    />
  )
}
