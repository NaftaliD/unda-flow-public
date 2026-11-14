import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/**
 * TEXT PLACEHOLDER. Replace with the designer's original SVG from public/brand/ (PLAN.md section 3).
 * Never redraw the logo in code.
 */
export function Logo({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <span
      role="img"
      aria-label={t('app.logoAlt')}
      lang="en"
      dir="ltr"
      className={cn('text-xl font-semibold tracking-[0.3em]', className)}
    >
      UNDA
    </span>
  )
}
