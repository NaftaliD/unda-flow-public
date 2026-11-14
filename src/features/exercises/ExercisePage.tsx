import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  useDeleteExercise,
  useSaveExercise,
  useSetArchived,
  useSetReviewStatus,
} from '@/data/mutations/exercises'
import { useBlocks, useEquipment, useExercises } from '@/data/queries/library'
import { useCurrentUser } from '@/data/queries/profile'
import { describeRequirements } from '@/domain/library'
import type { ExerciseFormValues } from '@/domain/schemas'
import { ExerciseForm } from './ExerciseForm'
import { toFormValues } from './formValues'

export function ExercisePage() {
  const { t } = useTranslation()
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()
  const { userId, isAdmin } = useCurrentUser()
  const exercises = useExercises()
  const blocks = useBlocks()
  const equipment = useEquipment()
  const save = useSaveExercise()
  const setReview = useSetReviewStatus()
  const setArchived = useSetArchived()
  const remove = useDeleteExercise()
  const verifyOnSave = useRef(false)
  const [inUse, setInUse] = useState(false)

  const exercise = exercises.data?.find((e) => e.id === id)

  if (exercises.isPending || blocks.isPending || equipment.isPending) {
    return <p className="p-6 text-sm text-muted-foreground">{t('library.loading')}</p>
  }
  if (!exercise) {
    return (
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
        <p role="alert">{t('exercise.notFound')}</p>
        <Link to="/exercises" className="text-sm font-semibold underline">
          {t('exercise.back')}
        </Link>
      </section>
    )
  }

  const editable = exercise.ownerId === userId || (exercise.ownerId === null && isAdmin === true)
  const blockName = blocks.data?.find((b) => b.id === exercise.blockId)?.name
  const equipmentText =
    describeRequirements(
      exercise.requirements,
      (eid) => equipment.data?.find((e) => e.id === eid)?.name ?? '?',
    ) || t('library.noEquipment')

  async function onSubmit(values: ExerciseFormValues) {
    const wantsVerify = verifyOnSave.current
    verifyOnSave.current = false
    try {
      await save.mutateAsync({
        ...values,
        id: exercise!.id,
        reviewStatus: wantsVerify ? 'verified' : undefined,
      })
      await navigate({ to: '/exercises' })
    } catch {
      /* surfaced via save.isError */
    }
  }

  async function onDelete() {
    if (!window.confirm(t('exercise.confirmDelete'))) return
    try {
      await remove.mutateAsync(exercise!.id)
      await navigate({ to: '/exercises' })
    } catch (e) {
      // 23503 = foreign key violation: the exercise is used in a lesson, so archive instead.
      if ((e as { code?: string }).code === '23503') setInUse(true)
    }
  }

  const header = (
    <div className="flex flex-col gap-2">
      <Link to="/exercises" className="text-sm font-semibold underline">
        {t('exercise.back')}
      </Link>
      <h1 className="text-2xl font-semibold">
        {editable ? t('exercise.editTitle') : exercise.name}
      </h1>
    </div>
  )

  if (!editable) {
    return (
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-6">
        {header}
        <p className="rounded-2xl bg-card p-4 text-sm">{t('exercise.sharedNote')}</p>
        <div className="flex flex-wrap gap-1.5">
          {blockName && <Badge tone="outline">{blockName}</Badge>}
          <Badge>{t(`levels.${exercise.level}`)}</Badge>
        </div>
        <dl className="flex flex-col gap-3 text-sm">
          <Detail label={t('exercise.equipmentTitle')} value={equipmentText} />
          <Detail label={t('exercise.description')} value={exercise.description} />
          <Detail label={t('exercise.cues')} value={exercise.cues} />
          <Detail label={t('exercise.reps')} value={exercise.defaultReps?.toString()} />
          <Detail label={t('exercise.duration')} value={exercise.defaultDurationSec?.toString()} />
          <Detail label={t('exercise.springs')} value={exercise.defaultSprings} />
        </dl>
        <Link
          to="/exercises/new"
          search={{ from: exercise.id }}
          className="inline-flex h-10 items-center self-start rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {t('exercise.duplicate')}
        </Link>
      </section>
    )
  }

  const canVerify = exercise.ownerId === null && exercise.reviewStatus === 'needs_review'

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-6">
      {header}
      {exercise.ownerId === null && (
        <p className="rounded-2xl bg-card p-4 text-sm">{t('exercise.adminSharedNote')}</p>
      )}
      {inUse && (
        <p role="alert" className="rounded-2xl border border-accent p-4 text-sm font-medium">
          {t('exercise.inUse')}
        </p>
      )}
      <ExerciseForm
        key={exercise.id}
        blocks={blocks.data ?? []}
        equipment={equipment.data ?? []}
        defaultValues={toFormValues(exercise)}
        submitLabel={t('exercise.save')}
        saving={save.isPending}
        error={save.isError}
        onSubmit={(v) => void onSubmit(v)}
        actions={
          <>
            {canVerify && (
              <Button
                type="submit"
                variant="outline"
                disabled={save.isPending}
                onClick={() => {
                  verifyOnSave.current = true
                }}
              >
                {t('exercise.saveAndVerify')}
              </Button>
            )}
            {canVerify && (
              <Button
                variant="outline"
                disabled={setReview.isPending}
                onClick={() =>
                  void setReview
                    .mutateAsync({ id: exercise.id, status: 'verified' })
                    .then(() => navigate({ to: '/exercises' }))
                }
              >
                {t('exercise.verify')}
              </Button>
            )}
            <Button
              variant="outline"
              disabled={setArchived.isPending}
              onClick={() =>
                void setArchived.mutateAsync({ id: exercise.id, archived: !exercise.isArchived })
              }
            >
              {exercise.isArchived ? t('exercise.unarchive') : t('exercise.archive')}
            </Button>
            <Button variant="outline" disabled={remove.isPending} onClick={() => void onDelete()}>
              {t('exercise.delete')}
            </Button>
          </>
        }
      />
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-semibold">{label}</dt>
      <dd className="whitespace-pre-line text-muted-foreground">{value}</dd>
    </div>
  )
}
