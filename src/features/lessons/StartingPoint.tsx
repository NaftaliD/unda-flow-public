import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { useLessons, type LessonSummary } from '@/data/queries/lessons'

function ClassCard({ l, example }: { l: LessonSummary; example: boolean }) {
  const { t } = useTranslation()
  const details = [
    l.targetDurationMin ? t('lessons.minutes', { count: l.targetDurationMin }) : null,
    t(`levels.${l.level}`),
    t('lessons.start.blocks', { count: l.blockCount }),
    l.exerciseCount > 0 ? t('lessons.builder.itemCount', { count: l.exerciseCount }) : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <li className="flex flex-col gap-3 rounded-3xl bg-card p-4 text-card-foreground">
      <div className="flex flex-col gap-1">
        <h3 dir="auto" className="flex flex-wrap items-center gap-2 text-base font-semibold">
          {l.title}
          {example && <Badge tone="outline">{t('lessons.start.example')}</Badge>}
        </h3>
        <p className="text-sm text-muted-foreground">{details}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          to="/lessons/new"
          search={{ from: l.id }}
          className="inline-flex h-10 items-center rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {t('lessons.start.use')}
        </Link>
        {example && (
          <Link
            to="/lessons/$id"
            params={{ id: l.id }}
            className="inline-flex h-10 items-center rounded-pill border border-border px-5 text-sm font-semibold hover:bg-muted"
          >
            {t('lessons.start.preview')}
          </Link>
        )}
      </div>
    </li>
  )
}

/** Step one of "New class": start from an example class, from one of your own, or blank. */
export function StartingPoint() {
  const { t } = useTranslation()
  const lessons = useLessons()
  const all = lessons.data ?? []
  const examples = all.filter((l) => l.ownerId === null)
  const recent = all.filter((l) => l.ownerId !== null).slice(0, 5)

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        <Link to="/" className="text-sm font-semibold underline">
          {t('lessons.back')}
        </Link>
        <h1 className="text-2xl font-semibold">{t('lessons.newTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('lessons.start.intro')}</p>
      </div>

      {lessons.isPending ? (
        <p className="text-sm text-muted-foreground">{t('lessons.loading')}</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t('lessons.start.examples')}</h2>
            {examples.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('lessons.start.noExamples')}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {examples.map((l) => (
                  <ClassCard key={l.id} l={l} example />
                ))}
              </ul>
            )}
          </div>

          {recent.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">{t('lessons.start.recent')}</h2>
              <ul className="flex flex-col gap-3">
                {recent.map((l) => (
                  <ClassCard key={l.id} l={l} example={false} />
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t('lessons.start.blankTitle')}</h2>
            <div className="flex flex-col gap-3 rounded-3xl border border-border p-4">
              <p className="text-sm text-muted-foreground">{t('lessons.start.blankBody')}</p>
              <div>
                <Link
                  to="/lessons/new"
                  search={{ from: 'blank' }}
                  className="inline-flex h-10 items-center rounded-pill border border-border px-5 text-sm font-semibold hover:bg-muted"
                >
                  {t('lessons.start.blank')}
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
