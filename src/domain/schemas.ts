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
})

export type ExerciseFormInput = z.input<typeof exerciseFormSchema>
export type ExerciseFormValues = z.output<typeof exerciseFormSchema>
