import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import type { Block, Equipment, Exercise } from '@/data/queries/library'
import type { Series } from '@/data/queries/series'
import type { Level } from '@/domain/library'
import { ExerciseChooser } from './ExercisePicker'
import { SetsChooser } from './SetsChooser'

type Props = {
  open: boolean
  onClose: () => void
  block: Block | undefined
  exercises: readonly Exercise[]
  equipment: readonly Equipment[]
  available: ReadonlySet<string>
  lessonLevel: Level
  userId: string | undefined
  /** Sets that belong to this block. */
  sets: readonly Series[]
  exerciseById: ReadonlyMap<string, Exercise>
  onAddExercises: (exercises: Exercise[]) => void
  onAddSet: (set: Series) => void
}

type Tab = 'exercises' | 'sets'

/**
 * One "Add" dialog per block with two tabs: pick exercises (tick as many as you like) or add a
 * whole set. Nothing here copies anything: shared exercises and sets are used as they are.
 */
export function AddDialog(props: Props) {
  const { t } = useTranslation()
  const title = t('lessons.add.title', { block: props.block?.name ?? '' })
  return (
    <Dialog open={props.open} onClose={props.onClose} title={title}>
      <Body {...props} title={title} />
    </Dialog>
  )
}

function Body({
  title,
  onClose,
  sets,
  exerciseById,
  equipment,
  available,
  onAddExercises,
  onAddSet,
  ...chooser
}: Props & { title: string }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('exercises')
  const tabs: { id: Tab; label: string }[] = [
    { id: 'exercises', label: t('lessons.add.exercises') },
    { id: 'sets', label: t('lessons.add.sets', { count: sets.length }) },
  ]

  return (
    <div className="flex max-h-[85dvh] flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button variant="outline" size="sm" onClick={onClose}>
          {t('lessons.picker.done')}
        </Button>
      </div>
      <div role="tablist" aria-label={title} className="flex gap-1.5">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            id={`add-tab-${x.id}`}
            aria-selected={tab === x.id}
            aria-controls={`add-panel-${x.id}`}
            onClick={() => setTab(x.id)}
            className={`inline-flex h-9 items-center rounded-pill border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${tab === x.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`add-panel-${tab}`}
        aria-labelledby={`add-tab-${tab}`}
        className="flex min-h-0 flex-1 flex-col gap-3"
      >
        {tab === 'exercises' ? (
          <ExerciseChooser
            {...chooser}
            equipment={equipment}
            available={available}
            onAdd={(list) => {
              onAddExercises(list)
              onClose()
            }}
          />
        ) : (
          <SetsChooser
            sets={sets}
            exerciseById={exerciseById}
            equipment={equipment}
            available={available}
            onAdd={(s) => {
              onAddSet(s)
              onClose()
            }}
          />
        )}
      </div>
    </div>
  )
}
