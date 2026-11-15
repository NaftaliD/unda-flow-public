import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDeleteSeries, useDuplicateSeries } from '@/data/mutations/series'
import { useBlocks } from '@/data/queries/library'
import { useCurrentUser } from '@/data/queries/profile'
import { useSeries, type Series } from '@/data/queries/series'

export function SeriesListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userId, isAdmin } = useCurrentUser()
  const series = useSeries()
  const blocks = useBlocks()
  const duplicate = useDuplicateSeries()
  const remove = useDeleteSeries()

  const all = series.data ?? []
  const shared = all.filter((x) => x.ownerId === null)
  const mine = all.filter((x) => x.ownerId !== null && x.ownerId === userId)
  const blockName = (id: string) => blocks.data?.find((b) => b.id === id)?.name ?? ''
  const canChange = (x: Series) => x.ownerId === userId || (x.ownerId === null && isAdmin)

  async function onDuplicate(x: Series) {
    const id = await duplicate.mutateAsync(x)
    await navigate({ to: '/series/$id', params: { id } })
  }

  async function onDelete(x: Series) {
    if (!window.confirm(t('series.confirmDelete'))) return
    await remove.mutateAsync(x.id)
  }

  function renderCard(x: Series) {
    return (
      <li key={x.id} className="flex flex-col gap-2 rounded-3xl bg-card p-4 text-card-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <h3 dir="auto" className="text-base font-semibold">
            {x.name}
          </h3>
          <Badge tone="outline">
            {t(x.ownerId === null ? 'templates.shared' : 'templates.mine')}
          </Badge>
          <span dir="auto" className="text-sm text-muted-foreground">
            {blockName(x.blockId)} · {t('series.exerciseCount', { count: x.exerciseIds.length })}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/series/$id"
            params={{ id: x.id }}
            className="inline-flex h-8 items-center rounded-pill border border-border px-3 text-sm font-semibold hover:bg-muted"
          >
            {t(canChange(x) ? 'templates.edit' : 'templates.view')}
          </Link>
          <Button
            variant="outline"
            size="sm"
            disabled={duplicate.isPending}
            onClick={() => void onDuplicate(x)}
          >
            {t('templates.duplicate')}
          </Button>
          {canChange(x) && (
            <Button variant="outline" size="sm" onClick={() => void onDelete(x)}>
              {t('templates.delete')}
            </Button>
          )}
        </div>
      </li>
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{t('series.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('series.intro')}</p>
        </div>
        <Link
          to="/series/new"
          className="inline-flex h-10 items-center rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {t('series.new')}
        </Link>
      </div>

      {series.isPending ? (
        <p className="text-sm text-muted-foreground">{t('templates.loading')}</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t('series.mineHeading')}</h2>
            {mine.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('series.emptyMine')}</p>
            ) : (
              <ul className="flex flex-col gap-3">{mine.map(renderCard)}</ul>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t('series.sharedHeading')}</h2>
            {shared.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('series.emptyShared')}</p>
            ) : (
              <ul className="flex flex-col gap-3">{shared.map(renderCard)}</ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}
