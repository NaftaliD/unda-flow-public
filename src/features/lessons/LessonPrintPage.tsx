import { Link, useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { useBlocks, useEquipment, useExercises } from '@/data/queries/library'
import { useLesson } from '@/data/queries/lessons'
import { formatMinutes, lessonDuration } from '@/domain/lesson'

/** Print-optimised lesson. The app header is hidden by AppLayout when printing. */
export function LessonPrintPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams({ strict: false }) as { id: string }
  const lesson = useLesson(id)
  const blocks = useBlocks()
  const equipment = useEquipment()
  const exercises = useExercises()

  if (lesson.isPending || blocks.isPending || equipment.isPending || exercises.isPending) {
    return <p className="p-6 text-sm text-muted-foreground">{t('lessons.loading')}</p>
  }
  const l = lesson.data
  if (!l) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
        <p role="alert">{t('lessons.notFound')}</p>
        <Link to="/" className="text-sm font-semibold underline">
          {t('lessons.back')}
        </Link>
      </section>
    )
  }

  const exerciseById = new Map((exercises.data ?? []).map((e) => [e.id, e]))
  const equipmentNames = (equipment.data ?? [])
    .filter((e) => l.equipmentIds.includes(e.id))
    .map((e) => e.name)
  const slots = l.slots.filter((s) => !s.isSkipped)
  const { totalSec } = lessonDuration(
    slots
      .flatMap((s) => s.items)
      .map((i) => ({
        durationSec: i.durationSec,
        defaultDurationSec: exerciseById.get(i.exerciseId)?.defaultDurationSec ?? null,
      })),
  )
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(
    new Date(`${l.lessonDate}T00:00:00`),
  )

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6 print:max-w-none print:gap-3 print:p-0 print:text-[11pt]">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link to="/lessons/$id" params={{ id: l.id }} className="text-sm font-semibold underline">
          {t('lessons.print.backToBuilder')}
        </Link>
        <Button onClick={() => window.print()}>{t('lessons.print.button')}</Button>
      </div>

      <header className="flex flex-col gap-1 border-b border-border pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold">{l.title}</h1>
          <Logo className="text-base text-muted-foreground" />
        </div>
        <p className="text-sm">
          {date} · {t(`levels.${l.level}`)}
          {l.targetDurationMin ? ` · ${t('lessons.minutes', { count: l.targetDurationMin })}` : ''}
          {totalSec > 0
            ? ` · ${t('lessons.print.planned', { time: formatMinutes(totalSec) })}`
            : ''}
        </p>
        {equipmentNames.length > 0 && (
          <p className="text-sm">
            <span className="font-semibold">{t('lessons.print.equipment')}: </span>
            {equipmentNames.join(', ')}
          </p>
        )}
        {l.notes && <p className="whitespace-pre-line text-sm">{l.notes}</p>}
      </header>

      <ol className="flex flex-col gap-4 print:gap-2.5">
        {slots.map((s, index) => (
          <li key={s.id} className="break-inside-avoid">
            <h2 className="flex items-baseline gap-2 text-base font-semibold">
              <span className="label-caps text-muted-foreground">{index + 1}</span>
              {s.label}
            </h2>
            {s.notes && (
              <p className="whitespace-pre-line text-sm text-muted-foreground">{s.notes}</p>
            )}
            {s.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1">
                {s.items.map((i) => {
                  const e = exerciseById.get(i.exerciseId)
                  const details = [
                    i.reps ? t('lessons.print.reps', { count: i.reps }) : null,
                    i.durationSec ? t('lessons.print.seconds', { count: i.durationSec }) : null,
                    i.springs ? t('lessons.print.springs', { value: i.springs }) : null,
                  ].filter(Boolean)
                  return (
                    <li key={i.id} className="text-sm">
                      <span className="font-semibold">{e?.name ?? '?'}</span>
                      {details.length > 0 && <span> — {details.join(' · ')}</span>}
                      {i.notes && <span className="text-muted-foreground"> ({i.notes})</span>}
                    </li>
                  )
                })}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </article>
  )
}
