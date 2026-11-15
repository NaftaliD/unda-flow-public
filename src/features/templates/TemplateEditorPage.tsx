import { zodResolver } from '@hookform/resolvers/zod'
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
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { GripVertical, X } from 'lucide-react'
import { useState } from 'react'
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type UseFormRegister,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useSaveTemplate } from '@/data/mutations/templates'
import { useBlocks, type Block } from '@/data/queries/library'
import { useCurrentUser } from '@/data/queries/profile'
import { useTemplates, type Template } from '@/data/queries/templates'
import {
  templateFormSchema,
  type TemplateFormInput,
  type TemplateFormValues,
} from '@/domain/schemas'

export function TemplateEditorPage() {
  const { t } = useTranslation()
  const { id } = useParams({ strict: false }) as { id?: string }
  const templates = useTemplates()
  const blocks = useBlocks()
  const { userId, isAdmin } = useCurrentUser()

  if (templates.isPending || blocks.isPending || (id && userId === undefined)) {
    return <p className="p-6 text-sm text-muted-foreground">{t('templates.loading')}</p>
  }
  const template = id ? templates.data?.find((x) => x.id === id) : undefined
  if (id && !template) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
        <p role="alert">{t('templates.notFound')}</p>
        <Link to="/templates" className="text-sm font-semibold underline">
          {t('templates.back')}
        </Link>
      </section>
    )
  }
  const editable =
    !template || template.ownerId === userId || (template.ownerId === null && isAdmin === true)
  return (
    <TemplateForm
      key={template?.id ?? 'new'}
      template={template}
      blocks={blocks.data ?? []}
      editable={editable}
      isAdmin={isAdmin === true}
    />
  )
}

function TemplateForm({
  template,
  blocks,
  editable,
  isAdmin,
}: {
  template: Template | undefined
  blocks: readonly Block[]
  editable: boolean
  isAdmin: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const save = useSaveTemplate()
  const [shared, setShared] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TemplateFormInput, unknown, TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: template?.name ?? '',
      description: template?.description ?? '',
      targetDurationMin: template?.targetDurationMin ?? '',
      slots: (template?.slots ?? []).map((s) => ({
        blockId: s.blockId,
        label: s.label,
        isOptional: s.isOptional,
        minExercises: s.minExercises ?? '',
        hint: s.hint ?? '',
      })),
    },
  })
  const { fields, append, remove, move } = useFieldArray({ control, name: 'slots' })
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const isShared = template?.ownerId === null

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    const from = fields.findIndex((f) => f.id === e.active.id)
    const to = fields.findIndex((f) => f.id === e.over?.id)
    if (from >= 0 && to >= 0) move(from, to)
  }

  async function onSubmit(values: TemplateFormValues) {
    const methodId = template?.methodId ?? blocks[0]?.methodId ?? ''
    try {
      await save.mutateAsync({ ...values, id: template?.id, methodId, shared: !template && shared })
      await navigate({ to: '/templates' })
    } catch {
      /* surfaced via save.isError */
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <div className="flex flex-col gap-2">
        <Link to="/templates" className="text-sm font-semibold underline">
          {t('templates.back')}
        </Link>
        <h1 className="text-2xl font-semibold">
          {template ? template.name : t('templates.newTitle')}
        </h1>
        {!editable && <p className="text-sm text-muted-foreground">{t('templates.readOnly')}</p>}
        {editable && isShared && (
          <p className="text-sm text-muted-foreground">{t('templates.adminEdit')}</p>
        )}
      </div>

      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-5"
        noValidate
      >
        <fieldset disabled={!editable} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tpl-name">{t('templates.form.name')}</Label>
            <Input id="tpl-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
            {errors.name && (
              <p role="alert" className="text-sm font-medium">
                {t('templates.form.required')}
              </p>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-desc">{t('templates.form.description')}</Label>
              <Textarea id="tpl-desc" rows={2} {...register('description')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-target">{t('templates.form.target')}</Label>
              <Input
                id="tpl-target"
                type="number"
                inputMode="numeric"
                min={1}
                {...register('targetDurationMin')}
              />
            </div>
          </div>
          {!template && isAdmin && (
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
            <h2 className="text-lg font-semibold">{t('templates.form.blocks')}</h2>
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('templates.form.noSlots')}</p>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={fields.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <ol className="flex flex-col gap-3">
                  {fields.map((f, i) => (
                    <SlotRow
                      key={f.id}
                      id={f.id}
                      index={i}
                      blocks={blocks}
                      register={register}
                      control={control}
                      onRemove={() => remove(i)}
                      disabled={!editable}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
            <div>
              <Button
                variant="outline"
                disabled={!editable || blocks.length === 0}
                onClick={() =>
                  append({
                    blockId: blocks[0]?.id ?? '',
                    label: blocks[0]?.name ?? '',
                    isOptional: false,
                    minExercises: '',
                    hint: '',
                  })
                }
              >
                {t('templates.form.addSlot')}
              </Button>
            </div>
          </div>
        </fieldset>

        {save.isError && (
          <p role="alert" className="text-sm font-medium">
            {t('templates.form.saveFailed')}
          </p>
        )}
        {editable && (
          <div>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('templates.form.saving') : t('templates.form.save')}
            </Button>
          </div>
        )}
      </form>
    </section>
  )
}

function SlotRow({
  id,
  index,
  blocks,
  register,
  control,
  onRemove,
  disabled,
}: {
  id: string
  index: number
  blocks: readonly Block[]
  register: UseFormRegister<TemplateFormInput>
  control: Control<TemplateFormInput, unknown, TemplateFormValues>
  onRemove: () => void
  disabled: boolean
}) {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })
  const label = useWatch({ control, name: `slots.${index}.label` }) || `#${index + 1}`
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-col gap-3 rounded-3xl bg-card p-4 text-card-foreground ${isDragging ? 'relative z-10 shadow-lg' : ''}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          disabled={disabled}
          aria-label={t('templates.form.dragSlot', { label })}
          className="inline-flex size-8 shrink-0 cursor-grab items-center justify-center rounded-pill text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`slot-block-${id}`}>{t('templates.form.block')}</Label>
            <Select id={`slot-block-${id}`} {...register(`slots.${index}.blockId`)}>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`slot-label-${id}`}>{t('templates.form.label')}</Label>
            <Input id={`slot-label-${id}`} {...register(`slots.${index}.label`)} />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={t('templates.form.removeSlot', { label })}
          onClick={onRemove}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[auto_8rem_1fr] sm:items-end">
        <label className="flex items-center gap-2 pb-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            {...register(`slots.${index}.isOptional`)}
          />
          {t('templates.form.optional')}
        </label>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`slot-min-${id}`}>{t('templates.form.minExercises')}</Label>
          <Input
            id={`slot-min-${id}`}
            type="number"
            inputMode="numeric"
            min={1}
            {...register(`slots.${index}.minExercises`)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`slot-hint-${id}`}>{t('templates.form.hint')}</Label>
          <Input id={`slot-hint-${id}`} dir="auto" {...register(`slots.${index}.hint`)} />
        </div>
      </div>
    </li>
  )
}
