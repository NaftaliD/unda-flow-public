import { cn } from '@/lib/utils'

/** Subtle terracotta wave used as a divider / empty-state motif. Purely decorative. */
export function WaveDivider({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={cn('h-3 w-30 text-accent rtl:-scale-x-100', className)}
    >
      <path d="M2 6c10-8 18-8 28 0s18 8 28 0 18-8 28 0 18 8 28 0" />
    </svg>
  )
}
