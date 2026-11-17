import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useSaveExercise } from '@/data/mutations/exercises'
import { useBlocks, useEquipment, useExercises } from '@/data/queries/library'
import type { ExerciseFormInput, ExerciseFormValues } from '@/domain/schemas'
import { ExerciseForm } from './ExerciseForm'
import { toFormValues } from './formValues'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

const EMPTY: ExerciseFormInput = {
  name: '',
  blockId: '',
  level: 'fundamental',
  description: '',
  cues: '',
  defaultReps: '',
  defaultDurationSec: '',
  defaultSprings: '',
  groups: [],
  optionalIds: [],
}

/** New private exercise; `?from=<id>` prefills it as a copy ("duplicate as mine"). */
export function NewExercisePage() {
  const { t } = useTranslation()
  useDocumentTitle(t('library.new'))
  const navigate = useNavigate()
  const { from } = useSearch({ strict: false }) as { from?: string }
  const exercises = useExercises()
  const blocks = useBlocks()
  const equipment = useEquipment()
  const save = useSaveExercise()

  if (exercises.isPending || blocks.isPending || equipment.isPending) {
    return <p className="p-6 text-sm text-muted-foreground">{t('library.loading')}</p>
  }

  const source = from ? exercises.data?.find((e) => e.id === from) : undefined
  const defaultValues = source
    ? toFormValues(source, t('exercise.copyName', { name: source.name }))
    : EMPTY

  async function onSubmit(values: ExerciseFormValues) {
    try {
      await save.mutateAsync(values)
      await navigate({ to: '/exercises' })
    } catch {
      /* surfaced via save.isError */
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-6">
      <div className="flex flex-col gap-2">
        <Link to="/exercises" className="text-sm font-semibold underline">
          {t('exercise.back')}
        </Link>
        <h1 className="text-2xl font-semibold">{t('exercise.newTitle')}</h1>
      </div>
      <ExerciseForm
        key={source?.id ?? 'new'}
        blocks={blocks.data ?? []}
        equipment={equipment.data ?? []}
        defaultValues={defaultValues}
        submitLabel={t('exercise.create')}
        saving={save.isPending}
        error={save.isError}
        onSubmit={(v) => void onSubmit(v)}
      />
    </section>
  )
}
