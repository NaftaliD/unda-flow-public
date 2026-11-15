import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { Lesson } from '@/data/queries/lessons'
import type { Exercise } from '@/data/queries/library'
import { formatDuration } from '@/domain/lesson'

/**
 * Read-only view of a shared example class, for people who cannot edit it. The way to use it is
 * to start a new class from it ("Use as starting point"), which copies it.
 */
export function ClassPreview({
  lesson,
  exerciseById,
}: {
  lesson: Lesson
  exerciseById: ReadonlyMap<string, Exercise>
}) {
  const { t } = useTranslation()
  const slots = lesson.slots.filter((s) => !s.isSkipped)

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        <Link to="/lessons/new" className="text-sm font-semibold underline">
          {t('lessons.start.back')}
        </Link>
        <h1 dir="auto" className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
          {lesson.title}
          <Badge tone="outline">{t('lessons.start.example')}</Badge>
        </h1>
        <p className="text-sm text-muted-foreground">
          {[
            lesson.targetDurationMin
              ? t('lessons.minutes', { count: lesson.targetDurationMin })
              : null,
            t(`levels.${lesson.level}`),
            t('lessons.start.blocks', { count: slots.length }),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <div>
          <Link
            to="/lessons/new"
            search={{ from: lesson.id }}
            className="inline-flex h-10 items-center rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t('lessons.start.use')}
          </Link>
        </div>
      </div>

      <ol aria-label={t('lessons.builder.blocks')} className="flex flex-col gap-3">
        {slots.map((s) => (
          <li
            key={s.id}
            className="flex flex-col gap-2 rounded-3xl bg-card p-4 text-card-foreground"
          >
            <h2 className="text-base font-semibold">{s.label}</h2>
            {s.hint && (
              <p dir="auto" className="text-sm text-muted-foreground">
                {s.hint}
              </p>
            )}
            {s.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('lessons.start.emptyBlock')}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {s.items.map((i) => {
                  const ex = exerciseById.get(i.exerciseId)
                  const seconds = i.durationSec ?? ex?.defaultDurationSec ?? null
                  const detail = [
                    i.reps !== null ? t('lessons.builder.repsCount', { count: i.reps }) : null,
                    seconds !== null ? formatDuration(seconds) : null,
                    i.springs,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                  return (
                    <li key={i.id} className="flex flex-col">
                      <span className="font-semibold">
                        {ex?.name ?? t('lessons.builder.unknownExercise')}
                      </span>
                      {detail && <span className="text-sm text-muted-foreground">{detail}</span>}
                    </li>
                  )
                })}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
