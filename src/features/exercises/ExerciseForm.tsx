import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Block, Equipment } from '@/data/queries/library'
import { LEVELS } from '@/domain/library'
import {
  exerciseFormSchema,
  type ExerciseFormInput,
  type ExerciseFormValues,
} from '@/domain/schemas'
import { RequirementsEditor } from './RequirementsEditor'

type Props = {
  blocks: readonly Block[]
  equipment: readonly Equipment[]
  defaultValues: ExerciseFormInput
  submitLabel: string
  saving: boolean
  error?: boolean
  onSubmit: (values: ExerciseFormValues) => void
  /** Extra buttons rendered beside Save (verify, archive, ...). */
  actions?: ReactNode
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  )
}

export function ExerciseForm({
  blocks,
  equipment,
  defaultValues,
  submitLabel,
  saving,
  error,
  onSubmit,
  actions,
}: Props) {
  const { t } = useTranslation()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ExerciseFormInput, unknown, ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues,
  })

  const required = t('exercise.errors.required')

  return (
    <form
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      className="flex flex-col gap-5"
      noValidate
    >
      <Field
        label={t('exercise.name')}
        htmlFor="ex-name"
        error={errors.name ? required : undefined}
      >
        <Input id="ex-name" {...register('name')} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={t('exercise.block')}
          htmlFor="ex-block"
          error={errors.blockId ? required : undefined}
        >
          <Select id="ex-block" {...register('blockId')}>
            <option value="">—</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('exercise.level')} htmlFor="ex-level">
          <Select id="ex-level" {...register('level')}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {t(`levels.${l}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label={t('exercise.description')} htmlFor="ex-description">
        <Textarea id="ex-description" {...register('description')} />
      </Field>
      <Field label={t('exercise.cues')} htmlFor="ex-cues">
        <Textarea id="ex-cues" {...register('cues')} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          label={t('exercise.reps')}
          htmlFor="ex-reps"
          error={errors.defaultReps ? t('exercise.errors.positive') : undefined}
        >
          <Input id="ex-reps" inputMode="numeric" {...register('defaultReps')} />
        </Field>
        <Field
          label={t('exercise.duration')}
          htmlFor="ex-duration"
          error={errors.defaultDurationSec ? t('exercise.errors.positive') : undefined}
        >
          <Input id="ex-duration" inputMode="numeric" {...register('defaultDurationSec')} />
        </Field>
        <Field label={t('exercise.springs')} htmlFor="ex-springs">
          <Input id="ex-springs" {...register('defaultSprings')} />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">{t('exercise.equipmentTitle')}</h2>
        <Controller
          control={control}
          name="groups"
          render={({ field }) => (
            <RequirementsEditor
              equipment={equipment}
              value={field.value}
              onChange={field.onChange}
              hasEmptyGroupError={Boolean(errors.groups)}
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">{t('exercise.bonusTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('exercise.bonusHelp')}</p>
        <Controller
          control={control}
          name="optionalIds"
          render={({ field }) => {
            const selected = field.value ?? []
            return (
              <div
                role="group"
                aria-label={t('exercise.bonusTitle')}
                className="flex flex-wrap gap-2"
              >
                {equipment
                  .filter((e) => e.kind === 'prop')
                  .map((e) => (
                    <Chip
                      key={e.id}
                      selected={selected.includes(e.id)}
                      onClick={() =>
                        field.onChange(
                          selected.includes(e.id)
                            ? selected.filter((id) => id !== e.id)
                            : [...selected, e.id],
                        )
                      }
                    >
                      {e.name}
                    </Chip>
                  ))}
              </div>
            )
          }}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium">
          {t('exercise.saveError')}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? t('exercise.saving') : submitLabel}
        </Button>
        {actions}
      </div>
    </form>
  )
}
