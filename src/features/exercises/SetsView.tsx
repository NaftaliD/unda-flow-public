import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WaveDivider } from '@/components/WaveDivider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useBlocks, useEquipment, useExercises } from '@/data/queries/library'
import { useSeries, type Series } from '@/data/queries/series'
import { formatDuration } from '@/domain/lesson'
import { seriesAvailability } from '@/domain/series'
import { SetEditorDialog } from './SetEditorDialog'

/**
 * The library's Sets view: ready-made groups of exercises, by block. Sets are shared content:
 * everyone browses and uses them (in a class, via Add); only admins edit them.
 */
export function SetsView({
  search,
  blockId,
  available,
  isAdmin,
}: {
  search: string
  blockId: string
  /** Equipment ticked in the library filters; sets it cannot support are greyed. */
  available: ReadonlySet<string>
  isAdmin: boolean
}) {
  const { t } = useTranslation()
  const sets = useSeries()
  const blocks = useBlocks()
  const exercises = useExercises()
  const equipment = useEquipment()
  const [open, setOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ set: Series | undefined } | null>(null)

  const exerciseById = useMemo(
    () => new Map((exercises.data ?? []).map((e) => [e.id, e])),
    [exercises.data],
  )
  const nameOf = (id: string) => equipment.data?.find((e) => e.id === id)?.name ?? '?'

  const q = search.trim().toLowerCase()
  const visible = (sets.data ?? []).filter(
    (s) =>
      (blockId === '' || s.blockId === blockId) &&
      (q === '' ||
        s.name.toLowerCase().includes(q) ||
        s.exerciseIds.some((id) => exerciseById.get(id)?.name.toLowerCase().includes(q))),
  )
  const groups = (blocks.data ?? [])
    .map((b) => ({ block: b, sets: visible.filter((s) => s.blockId === b.id) }))
    .filter((g) => g.sets.length > 0)

  if (sets.isPending || blocks.isPending || exercises.isPending) {
    return <p className="text-sm text-muted-foreground">{t('library.loading')}</p>
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-muted-foreground">{t('library.setsIntro')}</p>
        {isAdmin && (
          <Button onClick={() => setEditing({ set: undefined })}>{t('series.new')}</Button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-card px-6 py-12 text-center">
          <WaveDivider />
          <h2 className="text-lg font-semibold">{t('library.setsEmptyTitle')}</h2>
          <p className="max-w-xs text-sm text-muted-foreground">{t('library.setsEmptyBody')}</p>
        </div>
      ) : (
        groups.map(({ block, sets: list }) => (
          <section key={block.id} className="flex flex-col gap-3" aria-label={block.name}>
            <h2 dir="auto" className="text-lg font-semibold">
              {block.name}
            </h2>
            <ul className="flex flex-col gap-3">
              {list.map((s) => {
                const a = seriesAvailability(
                  s.exerciseIds,
                  exerciseById,
                  available.size > 0 ? available : new Set(equipment.data?.map((e) => e.id)),
                )
                const expanded = open === s.id
                return (
                  <li
                    key={s.id}
                    className={`flex flex-col gap-2 rounded-3xl bg-card p-4 text-card-foreground ${a.available ? '' : 'opacity-60'}`}
                  >
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : s.id)}
                      className="flex items-start justify-between gap-2 rounded-xl text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span dir="auto" className="text-base font-semibold">
                            {s.name}
                          </span>
                          <Badge tone="outline">
                            {t('series.exerciseCount', { count: a.addable })}
                          </Badge>
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
                    {isAdmin && (
                      <div>
                        <Button variant="outline" size="sm" onClick={() => setEditing({ set: s })}>
                          {t('templates.edit')}
                        </Button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}

      {isAdmin && (
        <SetEditorDialog
          open={editing !== null}
          onClose={() => setEditing(null)}
          set={editing?.set}
        />
      )}
    </div>
  )
}
