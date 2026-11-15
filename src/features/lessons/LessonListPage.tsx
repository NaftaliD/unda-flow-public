import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WaveDivider } from '@/components/WaveDivider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { useSession } from '@/data/auth'
import { useDeleteLesson, useDuplicateLesson } from '@/data/mutations/lessons'
import { useLessons, type LessonStatus, type LessonSummary } from '@/data/queries/lessons'
import { useProfile } from '@/data/queries/profile'

const TABS: LessonStatus[] = ['draft', 'ready', 'taught']

export function LessonListPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const session = useSession()
  const { data: profile } = useProfile(session?.user.id)
  // The signup trigger sets display_name to the email prefix; that is not a name to greet.
  const emailName = session?.user.email?.split('@')[0]
  const name =
    profile?.display_name && profile.display_name !== emailName ? profile.display_name : null
  const lessons = useLessons()
  const duplicate = useDuplicateLesson()
  const remove = useDeleteLesson()
  const [tab, setTab] = useState<LessonStatus>('draft')

  // Shared example classes are picked in "New class", not listed here.
  const all = (lessons.data ?? []).filter((l) => l.ownerId !== null)
  const shown = all.filter((l) => l.status === tab)

  async function onDuplicate(l: LessonSummary) {
    const id = await duplicate.mutateAsync(l.id)
    await navigate({ to: '/lessons/$id', params: { id } })
  }

  async function onDelete(l: LessonSummary) {
    if (!window.confirm(t('lessons.confirmDelete', { title: l.title }))) return
    await remove.mutateAsync(l.id)
  }

  const fmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' })

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {name ? t('home.greeting', { name }) : t('lessons.title')}
        </h1>
        <Link
          to="/lessons/new"
          className="inline-flex h-10 items-center rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {t('lessons.new')}
        </Link>
      </div>

      {lessons.isPending ? (
        <p className="text-sm text-muted-foreground">{t('lessons.loading')}</p>
      ) : all.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-card px-6 py-16 text-center text-card-foreground">
          <WaveDivider />
          <h2 className="text-lg font-semibold">{t('home.emptyTitle')}</h2>
          <p className="max-w-xs text-sm text-muted-foreground">{t('home.emptyBody')}</p>
          <Link to="/exercises" className="text-sm font-semibold underline">
            {t('home.browseLibrary')}
          </Link>
        </div>
      ) : (
        <>
          <div role="group" aria-label={t('lessons.tabs')} className="flex flex-wrap gap-1.5">
            {TABS.map((s) => (
              <Chip key={s} selected={tab === s} onClick={() => setTab(s)}>
                {t(`lessons.tab.${s}`)} ({all.filter((l) => l.status === s).length})
              </Chip>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('lessons.emptyTab')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {shown.map((l) => (
                <li
                  key={l.id}
                  className="flex flex-col gap-3 rounded-3xl bg-card p-4 text-card-foreground"
                >
                  <div className="flex flex-col gap-1.5">
                    <Link
                      to="/lessons/$id"
                      params={{ id: l.id }}
                      className="text-base font-semibold underline"
                    >
                      {l.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {l.lessonDate && (
                        <span>{fmt.format(new Date(`${l.lessonDate}T00:00:00`))}</span>
                      )}
                      <Badge tone="outline">{t(`levels.${l.level}`)}</Badge>
                      {l.targetDurationMin && (
                        <span>{t('lessons.minutes', { count: l.targetDurationMin })}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={duplicate.isPending}
                      onClick={() => void onDuplicate(l)}
                    >
                      {t('lessons.duplicate')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={remove.isPending}
                      onClick={() => void onDelete(l)}
                    >
                      {t('lessons.delete')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
