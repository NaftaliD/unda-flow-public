import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Equipment, Exercise } from '@/data/queries/library'
import type { Series } from '@/data/queries/series'
import { formatDuration } from '@/domain/lesson'
import { seriesAvailability } from '@/domain/series'

/**
 * Sets (ready-made groups of exercises for a block): open one to see what is in it, then add the
 * whole set. Sets the equipment cannot support are greyed, with what is missing named.
 */
export function SetsChooser({
  sets,
  exerciseById,
  equipment,
  available,
  onAdd,
}: {
  sets: readonly Series[]
  exerciseById: ReadonlyMap<string, Exercise>
  equipment: readonly Equipment[]
  available: ReadonlySet<string>
  onAdd: (set: Series) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<string | null>(null)
  const nameOf = (id: string) => equipment.find((e) => e.id === id)?.name ?? '?'

  if (sets.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('series.picker.none')}</p>
  }
  return (
    <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto">
      {sets.map((s) => {
        const a = seriesAvailability(s.exerciseIds, exerciseById, available)
        const expanded = open === s.id
        return (
          <li
            key={s.id}
            className={`flex flex-col gap-2 rounded-2xl border border-border p-3 ${a.available ? '' : 'opacity-60'}`}
          >
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : s.id)}
              className="flex items-start justify-between gap-2 rounded-xl text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span dir="auto" className="font-semibold">
                    {s.name}
                  </span>
                  <Badge tone="outline">{t('series.exerciseCount', { count: a.addable })}</Badge>
                  {s.ownerId === null && <Badge tone="outline">{t('series.shared')}</Badge>}
                </span>
                {!a.available && (
                  <span className="text-sm font-medium">
                    {t('lessons.picker.missing', {
                      items: a.missing.map((g) => g.map(nameOf).join(' / ')).join(', '),
                    })}
                  </span>
                )}
              </span>
              <ChevronDown
                className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            {expanded && (
              <ol className="flex flex-col gap-1 ps-1 text-sm">
                {s.exerciseIds.map((id) => {
                  const e = exerciseById.get(id)
                  return (
                    <li key={id} className="flex items-baseline justify-between gap-2">
                      <span>{e?.name ?? t('lessons.builder.unknownExercise')}</span>
                      {e && (
                        <span className="text-muted-foreground">
                          {formatDuration(e.defaultDurationSec)}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ol>
            )}
            <div>
              <Button size="sm" disabled={a.addable === 0} onClick={() => onAdd(s)}>
                {t('series.addSet', { name: s.name })}
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
