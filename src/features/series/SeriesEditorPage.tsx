import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useSaveSeries } from '@/data/mutations/series'
import { useBlocks, useEquipment, useExercises, type Block } from '@/data/queries/library'
import { useCurrentUser } from '@/data/queries/profile'
import { useSeries, type Series } from '@/data/queries/series'
import { moveInList } from '@/domain/lesson'
import { ExercisePicker } from '../lessons/ExercisePicker'

export function SeriesEditorPage() {
  const { t } = useTranslation()
  const { id } = useParams({ strict: false }) as { id?: string }
  const series = useSeries()
  const blocks = useBlocks()
  const exercises = useExercises()
  const equipment = useEquipment()
  const { userId, isAdmin } = useCurrentUser()

  if (
    series.isPending ||
    blocks.isPending ||
    exercises.isPending ||
    equipment.isPending ||
    (id && userId === undefined)
  ) {
    return <p className="p-6 text-sm text-muted-foreground">{t('templates.loading')}</p>
  }
  const current = id ? series.data?.find((x) => x.id === id) : undefined
  if (id && !current) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
        <p role="alert">{t('series.notFound')}</p>
        <Link to="/series" className="text-sm font-semibold underline">
          {t('series.back')}
        </Link>
      </section>
    )
  }
  const editable =
    !current || current.ownerId === userId || (current.ownerId === null && isAdmin === true)
  return (
    <SeriesForm
      key={current?.id ?? 'new'}
      series={current}
      blocks={blocks.data ?? []}
      editable={editable}
      isAdmin={isAdmin === true}
    />
  )
}

function SeriesForm({
  series,
  blocks,
  editable,
  isAdmin,
}: {
  series: Series | undefined
  blocks: readonly Block[]
  editable: boolean
  isAdmin: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const save = useSaveSeries()
  const exercises = useExercises()
  const equipment = useEquipment()
  const { userId } = useCurrentUser()
  const [name, setName] = useState(series?.name ?? '')
  const [blockId, setBlockId] = useState(series?.blockId ?? blocks[0]?.id ?? '')
  const [ids, setIds] = useState<string[]>(series?.exerciseIds ?? [])
  const [shared, setShared] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [touched, setTouched] = useState(false)

  const exerciseById = useMemo(
    () => new Map((exercises.data ?? []).map((e) => [e.id, e])),
    [exercises.data],
  )
  // The series editor offers every exercise of the block, whatever equipment it needs.
  const everything = useMemo(
    () => new Set((equipment.data ?? []).map((e) => e.id)),
    [equipment.data],
  )
  const block = blocks.find((b) => b.id === blockId)

  function onBlockChange(next: string) {
    setBlockId(next)
    // Exercises belong to one block; a series of another block starts empty.
    setIds((cur) => cur.filter((id) => exerciseById.get(id)?.blockId === next))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!name.trim() || !blockId) return
    try {
      await save.mutateAsync({
        id: series?.id,
        shared: !series && shared,
        blockId,
        name: name.trim(),
        exerciseIds: ids,
      })
      await navigate({ to: '/series' })
    } catch {
      /* surfaced via save.isError */
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <div className="flex flex-col gap-2">
        <Link to="/series" className="text-sm font-semibold underline">
          {t('series.back')}
        </Link>
        <h1 className="text-2xl font-semibold">{series ? series.name : t('series.newTitle')}</h1>
        {!editable && <p className="text-sm text-muted-foreground">{t('series.readOnly')}</p>}
        {editable && series?.ownerId === null && (
          <p className="text-sm text-muted-foreground">{t('series.adminEdit')}</p>
        )}
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-5" noValidate>
        <fieldset disabled={!editable} className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="series-name">{t('series.form.name')}</Label>
              <Input
                id="series-name"
                dir="auto"
                value={name}
                aria-invalid={touched && !name.trim()}
                onChange={(e) => setName(e.target.value)}
              />
              {touched && !name.trim() && (
                <p role="alert" className="text-sm font-medium">
                  {t('templates.form.required')}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="series-block">{t('series.form.block')}</Label>
              <Select
                id="series-block"
                value={blockId}
                onChange={(e) => onBlockChange(e.target.value)}
              >
                {blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {!series && isAdmin && (
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={shared}
                onChange={(e) => setShared(e.target.checked)}
              />
              {t('templates.publish')}
            </label>
          )}

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t('series.form.exercises')}</h2>
            {ids.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('series.form.noExercises')}</p>
            )}
            <ol className="flex flex-col gap-2">
              {ids.map((id, i) => {
                const name = exerciseById.get(id)?.name ?? t('lessons.builder.unknownExercise')
                return (
                  <li
                    key={id}
                    className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-card-foreground"
                  >
                    <span className="w-6 text-sm text-muted-foreground">{i + 1}</span>
                    <span className="min-w-0 flex-1 font-semibold">{name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!editable || i === 0}
                      aria-label={t('series.form.moveUp', { name })}
                      onClick={() => setIds(moveInList(ids, i, i - 1))}
                    >
                      <ArrowUp className="size-4" aria-hidden />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!editable || i === ids.length - 1}
                      aria-label={t('series.form.moveDown', { name })}
                      onClick={() => setIds(moveInList(ids, i, i + 1))}
                    >
                      <ArrowDown className="size-4" aria-hidden />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!editable}
                      aria-label={t('series.form.remove', { name })}
                      onClick={() => setIds(ids.filter((x) => x !== id))}
                    >
                      <X className="size-4" aria-hidden />
                    </Button>
                  </li>
                )
              })}
            </ol>
            <div>
              <Button
                variant="outline"
                disabled={!editable || !block}
                onClick={() => setPickerOpen(true)}
              >
                {t('series.form.addExercise')}
              </Button>
            </div>
          </div>
        </fieldset>

        {save.isError && (
          <p role="alert" className="text-sm font-medium">
            {t('series.form.saveFailed')}
          </p>
        )}
        {editable && (
          <div>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('templates.form.saving') : t('series.form.save')}
            </Button>
          </div>
        )}
      </form>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        block={block}
        exercises={(exercises.data ?? []).filter((e) => !ids.includes(e.id))}
        equipment={equipment.data ?? []}
        available={everything}
        lessonLevel="advanced"
        userId={userId}
        onPick={(e) => setIds((cur) => (cur.includes(e.id) ? cur : [...cur, e.id]))}
      />
    </section>
  )
}
