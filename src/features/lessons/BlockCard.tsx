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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, Eye, EyeOff, GripVertical, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Block, Exercise } from '@/data/queries/library'
import type { ItemPatch, SlotPatch } from '@/data/mutations/lessons'
import type { LessonItem, LessonSlot } from '@/data/queries/lessons'
import { formatDuration, itemWarnings, reorderIds } from '@/domain/lesson'
import { slotHintInfo } from '@/domain/template'
import { describeBonus } from '@/domain/library'

type Props = {
  slot: LessonSlot
  /** Planned time of this block, in whole minutes. */
  minutes: number
  block: Block | undefined
  exerciseById: ReadonlyMap<string, Exercise>
  available: ReadonlySet<string>
  equipmentName: (id: string) => string
  /** Other slots an item can be moved to. */
  otherSlots: { id: string; label: string }[]
  onUpdateSlot: (patch: Omit<SlotPatch, 'slotId'>) => void
  onAdd: () => void
  onRemoveSlot: () => void
  onReorderItems: (ids: string[]) => void
  onUpdateItem: (patch: ItemPatch) => void
  onMoveItem: (itemId: string, toSlotId: string) => void
  onDeleteItem: (itemId: string) => void
}

const dragHandle =
  'inline-flex size-8 shrink-0 cursor-grab items-center justify-center rounded-pill text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring touch-none'

export function BlockCard(props: Props) {
  const { slot, minutes, onUpdateSlot, onAdd, onRemoveSlot, onReorderItems } = props
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slot.id })
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const info = slotHintInfo(slot, slot.items.length)

  function onItemDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    onReorderItems(
      reorderIds(
        slot.items.map((i) => i.id),
        String(e.active.id),
        String(e.over.id),
      ),
    )
  }

  const [notesOpen, setNotesOpen] = useState(Boolean(slot.notes))

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
      className={`flex flex-col gap-3 rounded-3xl bg-card p-3 text-card-foreground sm:p-4 ${isDragging ? 'relative z-10 shadow-lg' : ''} ${slot.isSkipped ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          aria-label={t('lessons.builder.dragSlot', { label: slot.label })}
          className={dragHandle}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold">
            {slot.label}
            {slot.isSkipped && <Badge tone="outline">{t('lessons.builder.skipped')}</Badge>}
            {info.optional && !slot.isSkipped && (
              <Badge tone="outline">{t('lessons.builder.optional')}</Badge>
            )}
          </h3>
          {slot.items.length > 0 && !slot.isSkipped && (
            <p className="text-sm text-muted-foreground">
              {t('lessons.builder.itemCount', { count: slot.items.length })} ·{' '}
              {t('lessons.minutes', { count: minutes })}
            </p>
          )}
          {info.hint && (
            <p dir="auto" className="text-sm text-muted-foreground">
              {info.hint}
            </p>
          )}
          {info.belowMin !== null && (
            <p className="text-sm text-muted-foreground">
              {t('lessons.builder.usually', { count: info.belowMin })}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdateSlot({ isSkipped: !slot.isSkipped })}
        >
          {slot.isSkipped ? (
            <Eye className="size-4 sm:hidden" aria-hidden />
          ) : (
            <EyeOff className="size-4 sm:hidden" aria-hidden />
          )}
          <span className="sr-only sm:not-sr-only">
            {slot.isSkipped ? t('lessons.builder.include') : t('lessons.builder.skip')}
          </span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label={t('lessons.builder.removeBlock', { label: slot.label })}
          onClick={() => {
            if (slot.items.length === 0 || window.confirm(t('lessons.builder.removeBlockConfirm')))
              onRemoveSlot()
          }}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>

      {!slot.isSkipped && (
        <>
          {slot.items.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onItemDragEnd}
            >
              <SortableContext
                items={slot.items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="flex flex-col gap-2">
                  {slot.items.map((item) => (
                    <ItemRow key={item.id} item={item} {...props} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={onAdd}>
              {t('lessons.builder.add')}
            </Button>
            {!notesOpen && (
              <button
                type="button"
                className="px-1 text-sm font-semibold underline"
                onClick={() => setNotesOpen(true)}
              >
                {t('lessons.builder.addNotes')}
              </button>
            )}
          </div>
          {notesOpen && <SlotNotes slot={slot} onSave={(notes) => onUpdateSlot({ notes })} />}
        </>
      )}
    </li>
  )
}

function SlotNotes({ slot, onSave }: { slot: LessonSlot; onSave: (notes: string | null) => void }) {
  const { t } = useTranslation()
  return (
    <Textarea
      key={slot.notes ?? ''}
      aria-label={t('lessons.builder.blockNotes', { label: slot.label })}
      placeholder={t('lessons.builder.blockNotesPlaceholder')}
      rows={2}
      defaultValue={slot.notes ?? ''}
      onBlur={(e) => {
        const v = e.target.value.trim()
        if (v !== (slot.notes ?? '')) onSave(v || null)
      }}
    />
  )
}

function ItemRow({
  item,
  slot,
  exerciseById,
  available,
  equipmentName,
  otherSlots,
  onUpdateItem,
  onMoveItem,
  onDeleteItem,
}: Props & { item: LessonItem }) {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })
  const exercise = exerciseById.get(item.exerciseId)
  const warnings = exercise ? itemWarnings(exercise, available) : []
  const name = exercise?.name ?? t('lessons.builder.unknownExercise')
  const bonus = exercise ? describeBonus(exercise.requirements, equipmentName) : ''
  const [open, setOpen] = useState(false)
  const detailsId = `item-details-${item.id}`
  const seconds = item.durationSec ?? exercise?.defaultDurationSec ?? null
  const summary = [
    item.reps !== null ? t('lessons.builder.repsCount', { count: item.reps }) : null,
    seconds !== null ? formatDuration(seconds) : null,
    item.springs,
  ]
    .filter(Boolean)
    .join(' · ')

  const num = (field: 'reps' | 'durationSec', current: number | null) => (value: string) => {
    const n = value.trim() === '' ? null : Number.parseInt(value, 10)
    if (n !== null && (!Number.isFinite(n) || n <= 0)) return
    if (n !== current) onUpdateItem({ itemId: item.id, [field]: n })
  }
  const text = (field: 'springs' | 'notes', current: string | null) => (value: string) => {
    const v = value.trim()
    if (v !== (current ?? '')) onUpdateItem({ itemId: item.id, [field]: v || null })
  }

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
      className={`flex flex-col gap-2 rounded-2xl border border-border bg-background p-2 sm:p-3 ${isDragging ? 'relative z-10 shadow-lg' : ''}`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          aria-label={t('lessons.builder.dragItem', { name })}
          className={dragHandle}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen(!open)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl p-1 text-start hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{name}</span>
              {warnings.map((w) => (
                <Badge key={w} tone="accent">
                  {t(`lessons.builder.warnings.${w}`)}
                </Badge>
              ))}
            </span>
            <span className="text-sm text-muted-foreground">
              {summary || t('lessons.builder.tapToEdit')}
            </span>
            {bonus && (
              <span className="text-sm text-muted-foreground">
                {t('library.bonus', { items: bonus })}
              </span>
            )}
          </span>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        <Button
          variant="outline"
          size="sm"
          aria-label={t('lessons.builder.remove', { name })}
          onClick={() => onDeleteItem(item.id)}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>
      {open && (
        <div id={detailsId} className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <LabeledInput label={t('lessons.builder.reps')}>
              <Input
                key={item.reps ?? ''}
                type="number"
                inputMode="numeric"
                min={1}
                defaultValue={item.reps ?? ''}
                onBlur={(e) => num('reps', item.reps)(e.target.value)}
              />
            </LabeledInput>
            <LabeledInput label={t('lessons.builder.duration')}>
              <Input
                key={item.durationSec ?? ''}
                type="number"
                inputMode="numeric"
                min={1}
                defaultValue={item.durationSec ?? ''}
                onBlur={(e) => num('durationSec', item.durationSec)(e.target.value)}
              />
            </LabeledInput>
            <LabeledInput label={t('lessons.builder.springs')}>
              <Input
                key={item.springs ?? ''}
                defaultValue={item.springs ?? ''}
                onBlur={(e) => text('springs', item.springs)(e.target.value)}
              />
            </LabeledInput>
            <LabeledInput label={t('lessons.builder.moveTo')}>
              <Select
                value=""
                aria-label={t('lessons.builder.moveTo')}
                onChange={(e) => e.target.value && onMoveItem(item.id, e.target.value)}
              >
                <option value="">—</option>
                {otherSlots
                  .filter((s) => s.id !== slot.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
              </Select>
            </LabeledInput>
          </div>
          <Input
            key={item.notes ?? ''}
            aria-label={t('lessons.builder.notes')}
            placeholder={t('lessons.builder.notes')}
            defaultValue={item.notes ?? ''}
            onBlur={(e) => text('notes', item.notes)(e.target.value)}
          />
        </div>
      )}
    </li>
  )
}

function LabeledInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label-caps text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
