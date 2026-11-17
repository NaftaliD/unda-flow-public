import { Check } from 'lucide-react'
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

type ChooserProps = {
  block: Block | undefined
  exercises: readonly Exercise[]
  equipment: readonly Equipment[]
  available: ReadonlySet<string>
  lessonLevel: Level
  userId: string | undefined
  /** Called with everything ticked when "Add N" is pressed. */
  onAdd: (exercises: Exercise[]) => void
}

/**
 * Tick any number of exercises, then add them all at once. Pre-filtered to the block, the level
 * and the equipment available; shared exercises are added as they are, never copied.
 */
export function ExerciseChooser({
  block,
  exercises,
  equipment,
  available,
  lessonLevel,
  userId,
  onAdd,
}: ChooserProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [anyBlock, setAnyBlock] = useState(false)
  const [allLevels, setAllLevels] = useState(false)
  const [showUnavailable, setShowUnavailable] = useState(false)
  const [picked, setPicked] = useState<readonly string[]>([])

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
  const toggle = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  function add() {
    const byId = new Map(exercises.map((e) => [e.id, e]))
    // Keep the order the exercises were ticked in.
    onAdd(picked.map((id) => byId.get(id)).filter((e): e is Exercise => e !== undefined))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
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
        <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto">
          {entries.map(({ exercise, available: ok }) => {
            const missing = ok
              ? []
              : missingEquipment(exercise.requirements, available).map((ids) =>
                  ids.map(nameOf).join(' / '),
                )
            const on = picked.includes(exercise.id)
            return (
              <li key={exercise.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(exercise.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-start hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${on ? 'border-primary bg-muted' : 'border-border'} ${ok ? '' : 'opacity-60'}`}
                >
                  <span
                    aria-hidden
                    className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md border ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}
                  >
                    {on && <Check className="size-3.5" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{exercise.name}</span>
                      <Badge tone="outline">{t(`levels.${exercise.level}`)}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(exercise.defaultDurationSec)}
                      </span>
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
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="sticky bottom-0 -mx-1 bg-background px-1 pt-2">
        <Button className="w-full" disabled={picked.length === 0} onClick={add}>
          {picked.length === 0
            ? t('lessons.picker.pickSome')
            : t('lessons.picker.addCount', { count: picked.length })}
        </Button>
      </div>
    </div>
  )
}

type PickerProps = ChooserProps & {
  open: boolean
  onClose: () => void
}

/** The chooser in its own dialog (used where only exercises are offered, e.g. editing a set). */
export function ExercisePicker({ open, onClose, onAdd, ...rest }: PickerProps) {
  const { t } = useTranslation()
  const title = t('lessons.picker.title', { block: rest.block?.name ?? '' })
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="flex max-h-[85dvh] flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('lessons.picker.done')}
          </Button>
        </div>
        <ExerciseChooser
          {...rest}
          onAdd={(list) => {
            onAdd(list)
            onClose()
          }}
        />
      </div>
    </Dialog>
  )
}
