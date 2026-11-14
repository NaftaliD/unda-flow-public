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
import { Link, useParams } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  useAddItem,
  useDeleteItem,
  useMoveItem,
  useReorderItems,
  useReorderSlots,
  useSetLessonEquipment,
  useUpdateItem,
  useUpdateLesson,
  useUpdateSlot,
} from '@/data/mutations/lessons'
import { useBlocks, useEquipment, useExercises } from '@/data/queries/library'
import { useLesson, type Lesson, type LessonStatus } from '@/data/queries/lessons'
import { useCurrentUser } from '@/data/queries/profile'
import { formatMinutes, lessonDuration, reorderIds } from '@/domain/lesson'
import { LEVELS } from '@/domain/library'
import { BlockCard } from './BlockCard'
import { EquipmentChips } from './EquipmentChips'
import { ExercisePicker } from './ExercisePicker'

const STATUSES: LessonStatus[] = ['draft', 'ready', 'taught']

export function LessonBuilderPage() {
  const { t } = useTranslation()
  const { id } = useParams({ strict: false }) as { id: string }
  const lesson = useLesson(id)
  const blocks = useBlocks()
  const equipment = useEquipment()
  const exercises = useExercises()

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
  return <Builder lesson={lesson.data} />
}

function Builder({ lesson }: { lesson: Lesson }) {
  const { t } = useTranslation()
  const { userId } = useCurrentUser()
  const blocks = useBlocks()
  const equipment = useEquipment()
  const exercises = useExercises()
  const update = useUpdateLesson(lesson.id)
  const setEquipment = useSetLessonEquipment(lesson.id)
  const updateSlot = useUpdateSlot(lesson.id)
  const reorderSlots = useReorderSlots(lesson.id)
  const reorderItems = useReorderItems(lesson.id)
  const addItem = useAddItem(lesson.id)
  const updateItem = useUpdateItem(lesson.id)
  const moveItem = useMoveItem(lesson.id)
  const deleteItem = useDeleteItem(lesson.id)
  const [pickerSlotId, setPickerSlotId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const exerciseById = useMemo(
    () => new Map((exercises.data ?? []).map((e) => [e.id, e])),
    [exercises.data],
  )
  const available = useMemo(() => new Set(lesson.equipmentIds), [lesson.equipmentIds])
  const blockById = useMemo(() => new Map((blocks.data ?? []).map((b) => [b.id, b])), [blocks.data])

  const { totalSec, missingCount } = lessonDuration(
    lesson.slots
      .filter((s) => !s.isSkipped)
      .flatMap((s) => s.items)
      .map((i) => ({
        durationSec: i.durationSec,
        defaultDurationSec: exerciseById.get(i.exerciseId)?.defaultDurationSec ?? null,
      })),
  )

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
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/" className="text-sm font-semibold underline">
          {t('lessons.back')}
        </Link>
        <Link
          to="/lessons/$id/print"
          params={{ id: lesson.id }}
          className="inline-flex h-10 items-center rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {t('lessons.builder.print')}
        </Link>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl bg-card p-4 text-card-foreground">
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
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lesson-date">{t('lessons.form.date')}</Label>
            <Input
              id="lesson-date"
              type="date"
              key={lesson.lessonDate}
              defaultValue={lesson.lessonDate}
              onBlur={(e) => {
                if (e.target.value && e.target.value !== lesson.lessonDate)
                  update.mutate({ lessonDate: e.target.value })
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
          <EquipmentChips
            equipment={equipment.data ?? []}
            selected={lesson.equipmentIds}
            onChange={(ids) => setEquipment.mutate(ids)}
            label={t('lessons.form.equipment')}
          />
        </div>
        <p className="text-sm" aria-live="polite">
          {lesson.targetDurationMin
            ? t('lessons.builder.totalOfTarget', {
                time: formatMinutes(totalSec),
                target: lesson.targetDurationMin,
              })
            : t('lessons.builder.total', { time: formatMinutes(totalSec) })}
          {missingCount > 0 && (
            <span className="text-muted-foreground">
              {' · '}
              {t('lessons.builder.missingDuration', { count: missingCount })}
            </span>
          )}
        </p>
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
                block={blockById.get(slot.blockId)}
                exerciseById={exerciseById}
                available={available}
                otherSlots={slotRefs.filter((s) => s.id !== slot.id)}
                onUpdateSlot={(patch) => updateSlot.mutate({ slotId: slot.id, ...patch })}
                onAdd={() => setPickerSlotId(slot.id)}
                onReorderItems={(ids) => reorderItems.mutate({ slotId: slot.id, ids })}
                onUpdateItem={(patch) => updateItem.mutate(patch)}
                onMoveItem={(itemId, toSlotId) => moveItem.mutate({ itemId, toSlotId })}
                onDeleteItem={(itemId) => deleteItem.mutate(itemId)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      <ExercisePicker
        open={pickerSlot !== undefined}
        onClose={() => setPickerSlotId(null)}
        block={pickerSlot ? blockById.get(pickerSlot.blockId) : undefined}
        exercises={exercises.data ?? []}
        equipment={equipment.data ?? []}
        available={available}
        lessonLevel={lesson.level}
        userId={userId}
        onPick={(e) =>
          pickerSlot &&
          addItem.mutate({
            id: crypto.randomUUID(),
            slotId: pickerSlot.id,
            exerciseId: e.id,
            reps: e.defaultReps,
            durationSec: e.defaultDurationSec,
            springs: e.defaultSprings,
          })
        }
      />
    </section>
  )
}
