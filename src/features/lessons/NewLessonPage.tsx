import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useCreateLesson } from '@/data/mutations/lessons'
import { useBlocks, useEquipment } from '@/data/queries/library'
import { useLesson, type Lesson } from '@/data/queries/lessons'
import { LEVELS } from '@/domain/library'
import { lessonFormSchema, type LessonFormInput, type LessonFormValues } from '@/domain/schemas'
import { PresetBar } from '../presets/PresetBar'
import { EquipmentChips } from './EquipmentChips'
import { StartingPoint } from './StartingPoint'

const LENGTHS = [30, 45, 50, 55, 60]

/** "New class": pick a starting point, then a short form (title, length, level, equipment). */
export function NewLessonPage() {
  const { from } = useSearch({ strict: false }) as { from?: string }
  if (!from) return <StartingPoint />
  return <FromSource from={from} />
}

function FromSource({ from }: { from: string }) {
  const { t } = useTranslation()
  const blank = from === 'blank'
  const source = useLesson(blank ? '' : from)
  const blocks = useBlocks()
  const equipment = useEquipment()

  if (blocks.isPending || equipment.isPending || (!blank && source.isPending)) {
    return <p className="p-6 text-sm text-muted-foreground">{t('lessons.loading')}</p>
  }
  if (!blank && !source.data) {
    return (
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
        <p role="alert">{t('lessons.notFound')}</p>
        <Link to="/lessons/new" className="text-sm font-semibold underline">
          {t('lessons.start.back')}
        </Link>
      </section>
    )
  }
  return (
    <NewClassForm
      key={from}
      source={blank ? null : (source.data ?? null)}
      fallbackMethodId={blocks.data?.[0]?.methodId}
    />
  )
}

function NewClassForm({
  source,
  fallbackMethodId,
}: {
  source: Lesson | null
  fallbackMethodId: string | undefined
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const equipment = useEquipment()
  const create = useCreateLesson()
  const isExample = source?.ownerId === null
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LessonFormInput, unknown, LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      // An example keeps its name as a starting title; a copy of your own class says so.
      title: source
        ? isExample
          ? source.title
          : `${source.title} (${t('lessons.start.copy')})`
        : '',
      level: source?.level ?? 'fundamental',
      targetDurationMin: source?.targetDurationMin ?? '',
      equipmentIds: source?.equipmentIds ?? [],
    },
  })

  async function onSubmit(values: LessonFormValues) {
    try {
      const id = await create.mutateAsync({
        ...values,
        fromLessonId: source?.id ?? null,
        methodId: source?.methodId ?? fallbackMethodId,
      })
      await navigate({ to: '/lessons/$id', params: { id } })
    } catch {
      /* surfaced via create.isError */
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        <Link to="/lessons/new" className="text-sm font-semibold underline">
          {t('lessons.start.back')}
        </Link>
        <h1 className="text-2xl font-semibold">{t('lessons.newTitle')}</h1>
        <p className="text-sm text-muted-foreground">
          {source
            ? t('lessons.start.fromSource', { title: source.title })
            : t('lessons.start.fromBlank')}
        </p>
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
            dir="auto"
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="target">{t('lessons.form.target')}</Label>
          <Controller
            control={control}
            name="targetDurationMin"
            render={({ field }) => (
              <>
                <div
                  role="group"
                  aria-label={t('lessons.form.targetQuick')}
                  className="flex flex-wrap gap-1.5"
                >
                  {LENGTHS.map((n) => (
                    <Chip
                      key={n}
                      selected={Number(field.value) === n}
                      onClick={() => field.onChange(n)}
                    >
                      {t('lessons.minutes', { count: n })}
                    </Chip>
                  ))}
                </div>
                <Input
                  id="target"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className="max-w-40"
                  aria-invalid={Boolean(errors.targetDurationMin)}
                  value={field.value === undefined ? '' : String(field.value)}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="level">{t('lessons.form.level')}</Label>
          <Select id="level" className="max-w-60" {...register('level')}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {t(`levels.${l}`)}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>{t('lessons.form.equipment')}</Label>
          <p className="text-sm text-muted-foreground">{t('lessons.form.equipmentHint')}</p>
          <Controller
            control={control}
            name="equipmentIds"
            render={({ field }) => (
              <>
                <PresetBar selected={field.value} onLoad={field.onChange} />
                <EquipmentChips
                  equipment={equipment.data ?? []}
                  selected={field.value}
                  onChange={field.onChange}
                  label={t('lessons.form.equipment')}
                />
              </>
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
