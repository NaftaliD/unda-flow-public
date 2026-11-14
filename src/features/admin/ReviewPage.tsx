import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { WaveDivider } from '@/components/WaveDivider'
import { Button } from '@/components/ui/button'
import { useDeleteExercise, useSetReviewStatus } from '@/data/mutations/exercises'
import { useBlocks, useEquipment, useExercises } from '@/data/queries/library'
import { useCurrentUser } from '@/data/queries/profile'
import { ExerciseCard } from '@/features/exercises/ExerciseCard'

/** Admin queue: shared exercises still marked needs_review. */
export function ReviewPage() {
  const { t } = useTranslation()
  const { userId } = useCurrentUser()
  const exercises = useExercises()
  const blocks = useBlocks()
  const equipment = useEquipment()
  const setReview = useSetReviewStatus()
  const remove = useDeleteExercise()

  const queue = (exercises.data ?? []).filter(
    (e) => e.ownerId === null && e.reviewStatus === 'needs_review',
  )

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t('review.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('review.intro')}</p>
      </div>

      {exercises.isPending ? (
        <p className="text-sm text-muted-foreground">{t('library.loading')}</p>
      ) : exercises.isError ? (
        <p role="alert" className="text-sm font-medium">
          {t('library.loadError')}
        </p>
      ) : queue.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-card px-6 py-12 text-center">
          <WaveDivider />
          <h2 className="text-lg font-semibold">{t('review.emptyTitle')}</h2>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t('review.remaining', { count: queue.length })}
          </p>
          <ul className="flex flex-col gap-3">
            {queue.map((e) => (
              <ExerciseCard
                key={e.id}
                exercise={e}
                blocks={blocks.data ?? []}
                equipment={equipment.data ?? []}
                userId={userId}
                isAdmin
                actions={
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={setReview.isPending}
                      onClick={() => void setReview.mutateAsync({ id: e.id, status: 'verified' })}
                    >
                      {t('review.verify')}
                    </Button>
                    <Link
                      to="/exercises/$id"
                      params={{ id: e.id }}
                      className="inline-flex h-8 items-center rounded-pill border border-border px-3 text-sm font-semibold hover:bg-muted"
                    >
                      {t('review.edit')}
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (window.confirm(t('exercise.confirmDelete'))) {
                          void remove.mutateAsync(e.id)
                        }
                      }}
                    >
                      {t('exercise.delete')}
                    </Button>
                  </div>
                }
              />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
