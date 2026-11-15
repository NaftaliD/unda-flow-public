import { z } from 'zod'

const optionalInt = z.preprocess(
  (v) => (v === '' || v === null || v === undefined || Number.isNaN(v) ? undefined : v),
  z.coerce.number().int().positive().optional(),
)

export const exerciseFormSchema = z.object({
  name: z.string().trim().min(1, 'required'),
  blockId: z.string().min(1, 'required'),
  level: z.enum(['fundamental', 'intermediate', 'advanced']),
  description: z.string().optional(),
  cues: z.string().optional(),
  defaultReps: optionalInt,
  defaultDurationSec: optionalInt,
  defaultSprings: z.string().optional(),
  /** One inner array of equipment ids per alt group. Empty groups are rejected. */
  groups: z.array(z.array(z.string()).min(1, 'empty-group')),
  /** Bonus accessories: optional extras that never decide availability. */
  optionalIds: z.array(z.string()).default([]),
})

export type ExerciseFormInput = z.input<typeof exerciseFormSchema>
export type ExerciseFormValues = z.output<typeof exerciseFormSchema>

export const lessonFormSchema = z.object({
  title: z.string().trim().min(1, 'required'),
  lessonDate: z.string().min(1, 'required'),
  level: z.enum(['fundamental', 'intermediate', 'advanced']),
  targetDurationMin: optionalInt,
  equipmentIds: z.array(z.string()),
})

export type LessonFormInput = z.input<typeof lessonFormSchema>
export type LessonFormValues = z.output<typeof lessonFormSchema>

export const templateFormSchema = z.object({
  name: z.string().trim().min(1, 'required'),
  description: z.string().trim(),
  targetDurationMin: optionalInt,
  slots: z.array(
    z.object({
      blockId: z.string().min(1),
      label: z.string().trim().min(1, 'required'),
      isOptional: z.boolean(),
      minExercises: optionalInt,
      hint: z.string().trim(),
    }),
  ),
})

export type TemplateFormInput = z.input<typeof templateFormSchema>
export type TemplateFormValues = z.output<typeof templateFormSchema>
