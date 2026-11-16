import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Block, Equipment, Exercise } from '@/data/queries/library'
import { missingEquipment } from '@/domain/equipment'
import { formatDuration, pickerEntries } from '@/domain/lesson'
import { describeBonus, describeRequirements, type Level } from '@/domain/library'

type Props = {
  open: boolean
  onClose: () => void
  block: Block | undefined
  exercises: readonly Exercise[]
  equipment: readonly Equipment[]
  available: ReadonlySet<string>
  lessonLevel: Level
  userId: string | undefined
  onPick: (exercise: Exercise) => void
}

/** "Add exercise" dialog, pre-filtered to the block, the lesson level and today's equipment. */
export function ExercisePicker(props: Props) {
  const { open, onClose, block } = props
  const { t } = useTranslation()
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('lessons.picker.title', { block: block?.name ?? '' })}
    >
      <PickerBody {...props} />
    </Dialog>
  )
}

function PickerBody({
  onClose,
  block,
  exercises,
  equipment,
  available,
  lessonLevel,
  userId,
  onPick,
}: Props) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [anyBlock, setAnyBlock] = useState(false)
  const [allLevels, setAllLevels] = useState(false)
  const [showUnavailable, setShowUnavailable] = useState(false)
  const [added, setAdded] = useState<ReadonlySet<string>>(new Set())

  const entries = useMemo(
    () =>
      pickerEntries(
        exercises,
        {
          search,
          blockId: anyBlock ? undefined : block?.id,
          lessonLevel,
          allLevels,
          available,
          showUnavailable,
        },
        userId,
      ),
    [
      exercises,
      search,
      anyBlock,
      block?.id,
      lessonLevel,
      allLevels,
      available,
      showUnavailable,
      userId,
    ],
  )

  const nameOf = (id: string) => equipment.find((e) => e.id === id)?.name ?? '?'

  return (
    <div className="flex max-h-[85dvh] flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {t('lessons.picker.title', { block: block?.name ?? '' })}
        </h2>
        <Button variant="outline" size="sm" onClick={onClose}>
          {t('lessons.picker.done')}
        </Button>
      </div>
      <Input
        type="search"
        aria-label={t('library.search')}
        placeholder={t('library.searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="flex flex-wrap gap-1.5">
        <Chip selected={anyBlock} onClick={() => setAnyBlock(!anyBlock)}>
          {t('lessons.picker.allBlocks')}
        </Chip>
        <Chip selected={allLevels} onClick={() => setAllLevels(!allLevels)}>
          {t('lessons.picker.allLevels')}
        </Chip>
        <Chip selected={showUnavailable} onClick={() => setShowUnavailable(!showUnavailable)}>
          {t('lessons.picker.showUnavailable')}
        </Chip>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('lessons.picker.none')}</p>
      ) : (
        <ul className="flex flex-col gap-2 overflow-y-auto">
          {entries.map(({ exercise, available: ok }) => {
            const missing = ok
              ? []
              : missingEquipment(exercise.requirements, available).map((ids) =>
                  ids.map(nameOf).join(' / '),
                )
            return (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(exercise)
                    setAdded(new Set(added).add(exercise.id))
                  }}
                  className={`flex w-full flex-col gap-1 rounded-2xl border border-border p-3 text-start hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${ok ? '' : 'opacity-60'}`}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{exercise.name}</span>
                    <Badge tone="outline">{t(`levels.${exercise.level}`)}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(exercise.defaultDurationSec)}
                    </span>
                    {added.has(exercise.id) && (
                      <Badge tone="accent">{t('lessons.picker.added')}</Badge>
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {describeRequirements(exercise.requirements, nameOf) ||
                      t('library.noEquipment')}
                    {describeBonus(exercise.requirements, nameOf) &&
                      ` · ${t('library.bonus', { items: describeBonus(exercise.requirements, nameOf) })}`}
                  </span>
                  {!ok && (
                    <span className="text-sm font-medium">
                      {t('lessons.picker.missing', { items: missing.join(', ') })}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
