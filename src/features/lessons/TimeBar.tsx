import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { timeStatus } from '@/domain/lesson'

/**
 * Time used against the class length: "32 of 45 min · 13 min left", or "overbooked by 5 min".
 * The state is always in words (and an icon when overbooked), never colour alone.
 */
export function TimeBar({ totalSec, targetMin }: { totalSec: number; targetMin: number | null }) {
  const { t } = useTranslation()
  const s = timeStatus(totalSec, targetMin)
  const text =
    s.state === 'none'
      ? t('lessons.time.none', { used: s.usedMin })
      : s.state === 'under'
        ? t('lessons.time.under', { used: s.usedMin, target: s.targetMin, left: s.leftMin })
        : s.state === 'full'
          ? t('lessons.time.full', { used: s.usedMin, target: s.targetMin })
          : t('lessons.time.over', { used: s.usedMin, target: s.targetMin, over: s.overMin })

  return (
    <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-1.5 bg-background/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0">
      <p aria-live="polite" className="flex items-center gap-2 text-sm font-semibold">
        {s.state === 'over' && <AlertTriangle className="size-4 shrink-0" aria-hidden />}
        {text}
      </p>
      {s.targetMin !== null && (
        <div
          role="progressbar"
          aria-label={t('lessons.time.label')}
          aria-valuemin={0}
          aria-valuemax={s.targetMin}
          aria-valuenow={Math.min(s.usedMin, s.targetMin)}
          aria-valuetext={text}
          className="h-2 w-full overflow-hidden rounded-pill bg-muted"
        >
          <div
            className={`h-full rounded-pill ${s.state === 'over' ? 'bg-accent' : 'bg-primary'}`}
            style={{ width: `${Math.round(s.fraction * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
