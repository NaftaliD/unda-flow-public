import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useDeleteSeries, useSaveSeries } from '@/data/mutations/series'
import { useBlocks, useEquipment, useExercises } from '@/data/queries/library'
import { useCurrentUser } from '@/data/queries/profile'
import type { Series } from '@/data/queries/series'
import { moveInList } from '@/domain/lesson'
import { ExercisePicker } from '../lessons/ExercisePicker'

/**
 * Admin-only: create or edit a shared set (a ready-made group of exercises for one block).
 * Everyone else just uses sets from the library and the Add dialog.
 */
export function SetEditorDialog({
  open,
  onClose,
  set,
}: {
  open: boolean
  onClose: () => void
  /** undefined = a new set. */
  set: Series | undefined
}) {
  const { t } = useTranslation()
  const title = set ? t('series.editTitle') : t('series.newTitle')
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <Form key={set?.id ?? 'new'} set={set} title={title} onClose={onClose} />
    </Dialog>
  )
}

function Form({
  set,
  title,
  onClose,
}: {
  set: Series | undefined
  title: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const save = useSaveSeries()
  const remove = useDeleteSeries()
  const blocks = useBlocks()
  const exercises = useExercises()
  const equipment = useEquipment()
  const { userId } = useCurrentUser()
  const [name, setName] = useState(set?.name ?? '')
  const [blockId, setBlockId] = useState(set?.blockId ?? blocks.data?.[0]?.id ?? '')
  const [ids, setIds] = useState<string[]>(set?.exerciseIds ?? [])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [touched, setTouched] = useState(false)

  const exerciseById = useMemo(
    () => new Map((exercises.data ?? []).map((e) => [e.id, e])),
    [exercises.data],
  )
  // Offer every exercise of the block, whatever equipment it needs.
  const everything = useMemo(
    () => new Set((equipment.data ?? []).map((e) => e.id)),
    [equipment.data],
  )
  const block = blocks.data?.find((b) => b.id === blockId)

  function onBlockChange(next: string) {
    setBlockId(next)
    // Exercises belong to one block, so a set of another block starts empty.
    setIds((cur) => cur.filter((id) => exerciseById.get(id)?.blockId === next))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!name.trim() || !blockId) return
    try {
      await save.mutateAsync({
        id: set?.id,
        shared: !set,
        blockId,
        name: name.trim(),
        exerciseIds: ids,
      })
      onClose()
    } catch {
      /* surfaced via save.isError */
    }
  }

  async function onDelete() {
    if (!set || !window.confirm(t('series.confirmDelete'))) return
    try {
      await remove.mutateAsync(set.id)
      onClose()
    } catch {
      /* surfaced via remove.isError */
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto p-5"
      noValidate
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="set-name">{t('series.form.name')}</Label>
          <Input
            id="set-name"
            dir="auto"
            value={name}
            aria-invalid={touched && !name.trim()}
            onChange={(e) => setName(e.target.value)}
          />
          {touched && !name.trim() && (
            <p role="alert" className="text-sm font-medium">
              {t('library.requiredField')}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="set-block">{t('series.form.block')}</Label>
          <Select id="set-block" value={blockId} onChange={(e) => onBlockChange(e.target.value)}>
            {(blocks.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t('series.form.exercises')}</h3>
        {ids.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('series.form.noExercises')}</p>
        )}
        <ol className="flex flex-col gap-2">
          {ids.map((id, i) => {
            const exName = exerciseById.get(id)?.name ?? t('lessons.builder.unknownExercise')
            return (
              <li
                key={id}
                className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 text-card-foreground"
              >
                <span className="w-6 text-center text-sm text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 font-semibold">{exName}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={i === 0}
                  aria-label={t('series.form.moveUp', { name: exName })}
                  onClick={() => setIds(moveInList(ids, i, i - 1))}
                >
                  <ArrowUp className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={i === ids.length - 1}
                  aria-label={t('series.form.moveDown', { name: exName })}
                  onClick={() => setIds(moveInList(ids, i, i + 1))}
                >
                  <ArrowDown className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={t('series.form.remove', { name: exName })}
                  onClick={() => setIds(ids.filter((x) => x !== id))}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </li>
            )
          })}
        </ol>
        <div>
          <Button variant="outline" disabled={!block} onClick={() => setPickerOpen(true)}>
            {t('series.form.addExercise')}
          </Button>
        </div>
      </div>

      {(save.isError || remove.isError) && (
        <p role="alert" className="text-sm font-medium">
          {t('series.form.saveFailed')}
        </p>
      )}
      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex gap-2">
          <Button type="submit" disabled={save.isPending}>
            {t('series.form.save')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t('lessons.builder.cancel')}
          </Button>
        </div>
        {set && (
          <Button variant="outline" disabled={remove.isPending} onClick={() => void onDelete()}>
            {t('templates.delete')}
          </Button>
        )}
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        block={block}
        exercises={(exercises.data ?? []).filter((e) => !ids.includes(e.id))}
        equipment={equipment.data ?? []}
        available={everything}
        lessonLevel="advanced"
        userId={userId}
        onAdd={(list) =>
          setIds((cur) => [...cur, ...list.map((e) => e.id).filter((id) => !cur.includes(id))])
        }
      />
    </form>
  )
}
