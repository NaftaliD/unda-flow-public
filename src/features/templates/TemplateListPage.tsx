import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDeleteTemplate, useDuplicateTemplate } from '@/data/mutations/templates'
import { useCurrentUser } from '@/data/queries/profile'
import { useTemplates, type Template } from '@/data/queries/templates'
import { PresetsPanel } from '../presets/PresetsPanel'
import { BlocksPanel } from './BlocksPanel'

export function TemplateListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userId, isAdmin } = useCurrentUser()
  const templates = useTemplates()
  const duplicate = useDuplicateTemplate()
  const remove = useDeleteTemplate()

  const all = templates.data ?? []
  const shared = all.filter((x) => x.ownerId === null)
  const mine = all.filter((x) => x.ownerId !== null && x.ownerId === userId)

  async function onDuplicate(x: Template) {
    const id = await duplicate.mutateAsync(x)
    await navigate({ to: '/templates/$id', params: { id } })
  }

  async function onDelete(x: Template) {
    if (!window.confirm(t('templates.confirmDelete'))) return
    await remove.mutateAsync(x.id)
  }

  const canChange = (x: Template) => x.ownerId === userId || (x.ownerId === null && isAdmin)

  function Card({ x }: { x: Template }) {
    return (
      <li className="flex flex-col gap-2 rounded-3xl bg-card p-4 text-card-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">{x.name}</h3>
          <Badge tone="outline">
            {t(x.ownerId === null ? 'templates.shared' : 'templates.mine')}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {t('templates.slotCount', { count: x.slots.length })}
          </span>
        </div>
        {x.description && (
          <p dir="auto" className="text-sm text-muted-foreground">
            {x.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Link
            to="/templates/$id"
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
          <h1 className="text-2xl font-semibold">{t('templates.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('templates.intro')}</p>
        </div>
        <Link
          to="/templates/new"
          className="inline-flex h-10 items-center rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {t('templates.new')}
        </Link>
      </div>

      {templates.isPending ? (
        <p className="text-sm text-muted-foreground">{t('templates.loading')}</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t('templates.mineHeading')}</h2>
            {mine.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('templates.emptyMine')}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {mine.map((x) => (
                  <Card key={x.id} x={x} />
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t('templates.sharedHeading')}</h2>
            <ul className="flex flex-col gap-3">
              {shared.map((x) => (
                <Card key={x.id} x={x} />
              ))}
            </ul>
          </div>
        </>
      )}

      <PresetsPanel />
      <BlocksPanel />
    </section>
  )
}
