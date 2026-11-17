import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  useAddItem,
  useAddSlot,
  useDeleteItem,
  useDeleteSlot,
  useMoveItem,
  usePublishClass,
  useReorderItems,
  useReorderSlots,
  useSetLessonEquipment,
  useUpdateItem,
  useUpdateLesson,
  useUpdateSlot,
} from '@/data/mutations/lessons'
import { useAddSeriesToSlot } from '@/data/mutations/series'
import { useBlocks, useEquipment, useExercises } from '@/data/queries/library'
import { useLesson, type Lesson, type LessonStatus } from '@/data/queries/lessons'
import { useCurrentUser } from '@/data/queries/profile'
import { useSeries } from '@/data/queries/series'
import { lessonDuration, reorderIds } from '@/domain/lesson'
import { LEVELS } from '@/domain/library'
import { PresetBar } from '../presets/PresetBar'
import { BlockCard } from './BlockCard'
import { AddDialog } from './AddDialog'
import { AddBlockDialog } from './BuilderDialogs'
import { ClassPreview } from './ClassPreview'
import { EquipmentChips } from './EquipmentChips'
import { TimeBar } from './TimeBar'

const STATUSES: LessonStatus[] = ['draft', 'ready', 'taught']

export function LessonBuilderPage() {
  const { t } = useTranslation()
  const { id } = useParams({ strict: false }) as { id: string }
  const lesson = useLesson(id)
  const blocks = useBlocks()
  const equipment = useEquipment()
  const exercises = useExercises()
  const { isAdmin } = useCurrentUser()

  if (lesson.isPending || blocks.isPending || equipment.isPending || exercises.isPending) {
    return <p className="p-6 text-sm text-muted-foreground">{t('lessons.loading')}</p>
  }
  if (!lesson.data) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
        <p role="alert">{t('lessons.notFound')}</p>
        <Link to="/" className="text-sm font-semibold underline">
          {t('lessons.back')}
        </Link>
      </section>
    )
  }
  if (lesson.data.ownerId === null) {
    if (isAdmin === undefined) {
      return <p className="p-6 text-sm text-muted-foreground">{t('lessons.loading')}</p>
    }
    if (!isAdmin) {
      return (
        <ClassPreview
          lesson={lesson.data}
          exerciseById={new Map((exercises.data ?? []).map((e) => [e.id, e]))}
        />
      )
    }
  }
  return <Builder lesson={lesson.data} />
}

function Builder({ lesson }: { lesson: Lesson }) {
  const { t } = useTranslation()
  const { userId, isAdmin } = useCurrentUser()
  const navigate = useNavigate()
  const blocks = useBlocks()
  const equipment = useEquipment()
  const exercises = useExercises()
  const update = useUpdateLesson(lesson.id)
  const setEquipment = useSetLessonEquipment(lesson.id)
  const updateSlot = useUpdateSlot(lesson.id)
  const addSlot = useAddSlot(lesson.id)
  const deleteSlot = useDeleteSlot(lesson.id)
  const publish = usePublishClass()
  const [addBlockOpen, setAddBlockOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const reorderSlots = useReorderSlots(lesson.id)
  const reorderItems = useReorderItems(lesson.id)
  const addItem = useAddItem(lesson.id)
  const updateItem = useUpdateItem(lesson.id)
  const moveItem = useMoveItem(lesson.id)
  const deleteItem = useDeleteItem(lesson.id)
  const [pickerSlotId, setPickerSlotId] = useState<string | null>(null)
  const series = useSeries()
  const addSeries = useAddSeriesToSlot(lesson.id)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const exerciseById = useMemo(
    () => new Map((exercises.data ?? []).map((e) => [e.id, e])),
    [exercises.data],
  )
  const available = useMemo(() => new Set(lesson.equipmentIds), [lesson.equipmentIds])
  const equipmentNames = (equipment.data ?? [])
    .filter((e) => available.has(e.id))
    .map((e) => e.name)
  const blockById = useMemo(() => new Map((blocks.data ?? []).map((b) => [b.id, b])), [blocks.data])

  const secondsOf = (slot: Lesson['slots'][number]) =>
    lessonDuration(
      slot.items.map((i) => ({
        durationSec: i.durationSec,
        defaultDurationSec: exerciseById.get(i.exerciseId)?.defaultDurationSec ?? 0,
      })),
    ).totalSec
  const totalSec = lesson.slots.filter((s) => !s.isSkipped).reduce((n, s) => n + secondsOf(s), 0)

  const pickerSlot = lesson.slots.find((s) => s.id === pickerSlotId)
  const slotRefs = lesson.slots.map((s) => ({ id: s.id, label: s.label }))

  function onSlotDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    reorderSlots.mutate(
      reorderIds(
        lesson.slots.map((s) => s.id),
        String(e.active.id),
        String(e.over.id),
      ),
    )
  }

  const intOrNull = (v: string) => {
    const n = Number.parseInt(v, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:gap-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/" className="text-sm font-semibold underline">
          {t('lessons.back')}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && lesson.ownerId === userId && lesson.ownerId !== null && (
            <Button
              variant="outline"
              disabled={publish.isPending}
              onClick={() =>
                publish.mutate(lesson.id, {
                  onSuccess: () => {
                    toast.success(t('lessons.builder.published'))
                    void navigate({ to: '/' })
                  },
                  onError: () => toast.error(t('lessons.builder.publishFailed')),
                })
              }
            >
              {t('lessons.builder.publish')}
            </Button>
          )}
          <Link
            to="/lessons/$id/teach"
            params={{ id: lesson.id }}
            className="inline-flex h-10 items-center rounded-pill border border-border px-5 text-sm font-semibold hover:bg-muted"
          >
            {t('lessons.builder.teach')}
          </Link>
          <Link
            to="/lessons/$id/print"
            params={{ id: lesson.id }}
            className="inline-flex h-10 items-center rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t('lessons.builder.print')}
          </Link>
        </div>
      </div>

      <TimeBar totalSec={totalSec} targetMin={lesson.targetDurationMin} />

      <div className="flex flex-col gap-3 rounded-3xl bg-card p-3 text-card-foreground sm:gap-4 sm:p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lesson-title">{t('lessons.form.title')}</Label>
          <Input
            id="lesson-title"
            key={lesson.title}
            defaultValue={lesson.title}
            className="text-base font-semibold"
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v && v !== lesson.title) update.mutate({ title: v })
            }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {[
            t(`levels.${lesson.level}`),
            lesson.targetDurationMin
              ? t('lessons.minutes', { count: lesson.targetDurationMin })
              : null,
            t(`lessons.status.${lesson.status}`),
            equipmentNames.length > 0
              ? equipmentNames.join(', ')
              : t('lessons.builder.noEquipment'),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          aria-expanded={detailsOpen}
          aria-controls="lesson-details"
          onClick={() => setDetailsOpen(!detailsOpen)}
        >
          {detailsOpen ? t('lessons.builder.hideDetails') : t('lessons.builder.editDetails')}
        </Button>
        {detailsOpen && (
          <div id="lesson-details" className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lesson-date">{t('lessons.form.date')}</Label>
                <Input
                  id="lesson-date"
                  type="date"
                  key={lesson.lessonDate ?? ''}
                  defaultValue={lesson.lessonDate ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value || null
                    if (v !== lesson.lessonDate) update.mutate({ lessonDate: v })
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lesson-level">{t('lessons.form.level')}</Label>
                <Select
                  id="lesson-level"
                  value={lesson.level}
                  onChange={(e) => update.mutate({ level: e.target.value as Lesson['level'] })}
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {t(`levels.${l}`)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lesson-target">{t('lessons.form.target')}</Label>
                <Input
                  id="lesson-target"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  key={lesson.targetDurationMin ?? ''}
                  defaultValue={lesson.targetDurationMin ?? ''}
                  onBlur={(e) => {
                    const n = intOrNull(e.target.value)
                    if (n !== lesson.targetDurationMin) update.mutate({ targetDurationMin: n })
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lesson-status">{t('lessons.builder.status')}</Label>
                <Select
                  id="lesson-status"
                  value={lesson.status}
                  onChange={(e) => update.mutate({ status: e.target.value as LessonStatus })}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`lessons.status.${s}`)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('lessons.form.equipment')}</Label>
              <PresetBar
                selected={lesson.equipmentIds}
                onLoad={(ids) => setEquipment.mutate(ids)}
              />
              <EquipmentChips
                equipment={equipment.data ?? []}
                selected={lesson.equipmentIds}
                onChange={(ids) => setEquipment.mutate(ids)}
                label={t('lessons.form.equipment')}
              />
            </div>
          </div>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSlotDragEnd}>
        <SortableContext
          items={lesson.slots.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol aria-label={t('lessons.builder.blocks')} className="flex flex-col gap-3">
            {lesson.slots.map((slot) => (
              <BlockCard
                key={slot.id}
                slot={slot}
                minutes={Math.round(secondsOf(slot) / 60)}
                block={blockById.get(slot.blockId)}
                exerciseById={exerciseById}
                available={available}
                equipmentName={(id) => equipment.data?.find((e) => e.id === id)?.name ?? '?'}
                otherSlots={slotRefs.filter((s) => s.id !== slot.id)}
                onUpdateSlot={(patch) => updateSlot.mutate({ slotId: slot.id, ...patch })}
                onAdd={() => setPickerSlotId(slot.id)}
                onRemoveSlot={() => deleteSlot.mutate(slot.id)}
                onReorderItems={(ids) => reorderItems.mutate({ slotId: slot.id, ids })}
                onUpdateItem={(patch) => updateItem.mutate(patch)}
                onMoveItem={(itemId, toSlotId) => moveItem.mutate({ itemId, toSlotId })}
                onDeleteItem={(itemId) => deleteItem.mutate(itemId)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      {lesson.slots.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('lessons.builder.noBlocks')}</p>
      )}
      <div>
        <Button variant="outline" onClick={() => setAddBlockOpen(true)}>
          {t('lessons.builder.addBlock')}
        </Button>
      </div>

      <AddBlockDialog
        open={addBlockOpen}
        onClose={() => setAddBlockOpen(false)}
        blocks={blocks.data ?? []}
        onAdd={(blockId, label) => addSlot.mutate({ id: crypto.randomUUID(), blockId, label })}
      />
      <AddDialog
        open={pickerSlot !== undefined}
        onClose={() => setPickerSlotId(null)}
        block={pickerSlot ? blockById.get(pickerSlot.blockId) : undefined}
        exercises={exercises.data ?? []}
        equipment={equipment.data ?? []}
        available={available}
        lessonLevel={lesson.level}
        userId={userId}
        sets={(series.data ?? []).filter((x) => x.blockId === pickerSlot?.blockId)}
        exerciseById={exerciseById}
        onAddExercises={(list) => {
          if (!pickerSlot) return
          for (const e of list) {
            addItem.mutate({
              id: crypto.randomUUID(),
              slotId: pickerSlot.id,
              exerciseId: e.id,
              reps: e.defaultReps,
              durationSec: e.defaultDurationSec,
              springs: e.defaultSprings,
            })
          }
        }}
        onAddSet={(set) =>
          pickerSlot && addSeries.mutate({ slotId: pickerSlot.id, seriesId: set.id })
        }
      />
    </section>
  )
}
