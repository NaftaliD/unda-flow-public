import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useCreateLesson } from '@/data/mutations/lessons'
import { useBlocks, useEquipment } from '@/data/queries/library'
import { useTemplates } from '@/data/queries/templates'
import { LEVELS } from '@/domain/library'
import { lessonFormSchema, type LessonFormInput, type LessonFormValues } from '@/domain/schemas'
import { EquipmentChips } from './EquipmentChips'

function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function NewLessonPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const blocks = useBlocks()
  const equipment = useEquipment()
  const templates = useTemplates()
  const create = useCreateLesson()
  // undefined = not chosen yet: default to the first shared template. '' = blank lesson.
  const [chosenTemplate, setChosenTemplate] = useState<string | undefined>(undefined)
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LessonFormInput, unknown, LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      title: '',
      lessonDate: today(),
      level: 'fundamental',
      targetDurationMin: '',
      equipmentIds: [],
    },
  })

  if (blocks.isPending || equipment.isPending || templates.isPending) {
    return <p className="p-6 text-sm text-muted-foreground">{t('lessons.loading')}</p>
  }

  const templateList = templates.data ?? []
  const templateId = chosenTemplate ?? templateList.find((x) => x.ownerId === null)?.id ?? ''
  const template = templateList.find((x) => x.id === templateId)

  async function onSubmit(values: LessonFormValues) {
    try {
      const methodId = template?.methodId ?? blocks.data?.[0]?.methodId ?? ''
      const id = await create.mutateAsync({ ...values, methodId, templateId: template?.id ?? null })
      await navigate({ to: '/lessons/$id', params: { id } })
    } catch {
      /* surfaced via create.isError */
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-6">
      <div className="flex flex-col gap-2">
        <Link to="/" className="text-sm font-semibold underline">
          {t('lessons.back')}
        </Link>
        <h1 className="text-2xl font-semibold">{t('lessons.newTitle')}</h1>
      </div>
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-5"
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">{t('lessons.form.title')}</Label>
          <Input
            id="title"
            placeholder={t('lessons.form.titlePlaceholder')}
            aria-invalid={Boolean(errors.title)}
            {...register('title')}
          />
          {errors.title && (
            <p role="alert" className="text-sm font-medium">
              {t('lessons.form.required')}
            </p>
          )}
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lessonDate">{t('lessons.form.date')}</Label>
            <Input id="lessonDate" type="date" {...register('lessonDate')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="level">{t('lessons.form.level')}</Label>
            <Select id="level" {...register('level')}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {t(`levels.${l}`)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="target">{t('lessons.form.target')}</Label>
            <Input
              id="target"
              type="number"
              inputMode="numeric"
              min={1}
              aria-invalid={Boolean(errors.targetDurationMin)}
              {...register('targetDurationMin')}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="template">{t('lessons.form.template')}</Label>
          <Select
            id="template"
            value={templateId}
            onChange={(e) => setChosenTemplate(e.target.value)}
          >
            {templateList.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
            <option value="">{t('lessons.form.templateBlank')}</option>
          </Select>
          <p className="text-sm text-muted-foreground">{t('lessons.form.templateHint')}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label>{t('lessons.form.equipment')}</Label>
          <p className="text-sm text-muted-foreground">{t('lessons.form.equipmentHint')}</p>
          <Controller
            control={control}
            name="equipmentIds"
            render={({ field }) => (
              <EquipmentChips
                equipment={equipment.data ?? []}
                selected={field.value}
                onChange={field.onChange}
                label={t('lessons.form.equipment')}
              />
            )}
          />
        </div>
        {create.isError && (
          <p role="alert" className="text-sm font-medium">
            {t('lessons.form.createFailed')}
          </p>
        )}
        <div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? t('lessons.form.creating') : t('lessons.form.create')}
          </Button>
        </div>
      </form>
    </section>
  )
}
