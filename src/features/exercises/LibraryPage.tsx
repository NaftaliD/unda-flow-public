import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WaveDivider } from '@/components/WaveDivider'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useCurrentUser } from '@/data/queries/profile'
import { useBlocks, useEquipment, useExercises } from '@/data/queries/library'
import {
  LEVELS,
  filterExercises,
  groupByMovement,
  type Level,
  type LibraryFilter,
} from '@/domain/library'
import { MovementCard } from './MovementCard'

type Scope = NonNullable<LibraryFilter['scope']>
const SCOPES: Exclude<Scope, 'all'>[] = ['shared', 'mine']

export function LibraryPage() {
  const { t } = useTranslation()
  const { userId, isAdmin } = useCurrentUser()
  const exercises = useExercises()
  const blocks = useBlocks()
  const equipment = useEquipment()

  const [search, setSearch] = useState('')
  const [blockId, setBlockId] = useState('')
  const [level, setLevel] = useState<Level | ''>('')
  const [scope, setScope] = useState<Scope>('all')
  const [showArchived, setShowArchived] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [available, setAvailable] = useState<ReadonlySet<string>>(new Set())

  const visible = useMemo(
    () =>
      filterExercises(
        exercises.data ?? [],
        {
          search,
          blockId: blockId || undefined,
          level: level || undefined,
          scope,
          showArchived,
          available: available.size > 0 ? available : undefined,
        },
        userId,
      ),
    [exercises.data, search, blockId, level, scope, showArchived, available, userId],
  )

  const movements = useMemo(() => groupByMovement(visible), [visible])

  // "All" means no filters at all: it is on only while nothing is narrowing the list.
  const anyFilter =
    search.trim() !== '' ||
    blockId !== '' ||
    level !== '' ||
    scope !== 'all' ||
    showArchived ||
    available.size > 0

  function resetFilters() {
    setSearch('')
    setBlockId('')
    setLevel('')
    setScope('all')
    setShowArchived(false)
    setAvailable(new Set())
  }

  function toggleEquipment(id: string) {
    const next = new Set(available)
    if (!next.delete(id)) next.add(id)
    setAvailable(next)
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('library.title')}</h1>
        <Link
          to="/exercises/new"
          className="inline-flex h-10 items-center rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {t('library.new')}
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-border p-4 sm:gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lib-search">{t('library.search')}</Label>
          <Input
            id="lib-search"
            type="search"
            value={search}
            placeholder={t('library.searchPlaceholder')}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="self-start sm:hidden"
          aria-expanded={filtersOpen}
          aria-controls="lib-filters"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          {anyFilter ? t('library.filtersActive') : t('library.filters')}
        </Button>

        <div
          id="lib-filters"
          className={`${filtersOpen ? 'flex' : 'hidden'} flex-col gap-4 sm:flex`}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lib-block">{t('library.block')}</Label>
              <Select id="lib-block" value={blockId} onChange={(e) => setBlockId(e.target.value)}>
                <option value="">{t('library.allBlocks')}</option>
                {blocks.data?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lib-level">{t('library.level')}</Label>
              <Select
                id="lib-level"
                value={level}
                onChange={(e) => setLevel(e.target.value as Level | '')}
              >
                <option value="">{t('library.allLevels')}</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {t(`levels.${l}`)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2" role="group" aria-labelledby="lib-equipment">
            <span id="lib-equipment" className="text-sm font-semibold">
              {t('library.equipmentTitle')}
            </span>
            <p className="text-sm text-muted-foreground">{t('library.equipmentHint')}</p>
            <div className="flex flex-wrap gap-2">
              {equipment.data?.map((e) => (
                <Chip
                  key={e.id}
                  selected={available.has(e.id)}
                  onClick={() => toggleEquipment(e.id)}
                >
                  {e.name}
                </Chip>
              ))}
            </div>
          </div>

          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label={t('library.scope')}
          >
            <Chip selected={!anyFilter} onClick={resetFilters}>
              {t('library.scopes.all')}
            </Chip>
            {SCOPES.map((s) => (
              <Chip
                key={s}
                selected={scope === s}
                onClick={() => setScope(scope === s ? 'all' : s)}
              >
                {t(`library.scopes.${s}`)}
              </Chip>
            ))}
            <Chip selected={showArchived} onClick={() => setShowArchived(!showArchived)}>
              {t('library.showArchived')}
            </Chip>
          </div>
        </div>
      </div>

      {exercises.isError ? (
        <p role="alert" className="text-sm font-medium">
          {t('library.loadError')}
        </p>
      ) : exercises.isPending ? (
        <p className="text-sm text-muted-foreground">{t('library.loading')}</p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-card px-6 py-12 text-center">
          <WaveDivider />
          <h2 className="text-lg font-semibold">{t('library.emptyTitle')}</h2>
          <p className="max-w-xs text-sm text-muted-foreground">{t('library.emptyBody')}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t('library.count', { count: movements.length })}
          </p>
          <ul className="flex flex-col gap-3">
            {movements.map((g) => (
              <MovementCard
                key={g.key}
                group={g}
                blocks={blocks.data ?? []}
                equipment={equipment.data ?? []}
                userId={userId}
                isAdmin={isAdmin === true}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
