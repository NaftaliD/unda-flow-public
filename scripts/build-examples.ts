import { exerciseId, uuidV5 } from './build-import.ts'

/**
 * Example classes: shared classes (owner NULL) people start new classes from. Defined in JSON,
 * validated here before anything is written. Exercises are referenced by name and equipment spec
 * (the same pair that gives an imported exercise its id), so a class can only use exercises that
 * exist.
 */
export type ExampleItem = {
  exercise: string
  /** The exercise's equipment spec as in the CSV, e.g. "mat|reformer|cadillac" or "reformer+ball". */
  equipment: string
  reps?: number
  /** Time for this item; without it the exercise's own time is used. */
  seconds?: number
  springs?: string
  notes?: string
}
export type ExampleSlot = {
  block: string
  label: string
  hint?: string
  optional?: boolean
  minExercises?: number
  items: ExampleItem[]
}
export type ExampleClass = {
  /** Fill an existing (empty) shared class, e.g. the seeded 12-block example, instead of making one. */
  id?: string
  title: string
  notes?: string
  level: string
  targetDurationMin?: number
  /** Equipment keys the class assumes. */
  equipment: string[]
  slots: ExampleSlot[]
}
export type ExampleFile = { classes: ExampleClass[] }

export type ExampleLookups = {
  methodId: string
  blocksByKey: ReadonlyMap<string, string>
  equipmentByKey: ReadonlyMap<string, string>
  /** Ids of the shared exercises that exist. */
  exerciseIds: ReadonlySet<string>
}

export type PlannedSlot = {
  id: string
  label: string
  row: {
    id: string
    lesson_id: string
    block_id: string
    position: number
    label: string
    is_optional: boolean
    min_exercises: number | null
    hint: string | null
  }
  items: {
    id: string
    lesson_slot_id: string
    exercise_id: string
    position: number
    reps: number | null
    duration_sec: number | null
    springs: string | null
    notes: string | null
  }[]
}
export type PlannedClass = {
  id: string
  /** True when the definition names an existing class to fill. */
  fillExisting: boolean
  lesson: {
    id: string
    owner_id: null
    method_id: string
    title: string
    notes: string | null
    level: string
    target_duration_min: number | null
    status: 'ready'
  }
  equipmentIds: string[]
  slots: PlannedSlot[]
}

const LEVELS = new Set(['fundamental', 'intermediate', 'advanced'])
const positive = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n > 0

/** Validates every class before anything is written; throws one error listing all problems. */
export function buildExamples(file: ExampleFile, lookups: ExampleLookups): PlannedClass[] {
  const errors: string[] = []
  const planned: PlannedClass[] = []

  for (const c of file.classes) {
    const where = `class "${c.title}"`
    if (!c.title?.trim()) errors.push('a class has no title')
    if (!LEVELS.has(c.level)) errors.push(`${where}: unknown level "${c.level}"`)
    if (c.targetDurationMin !== undefined && !positive(c.targetDurationMin)) {
      errors.push(`${where}: targetDurationMin must be a positive whole number`)
    }
    const id = c.id ?? uuidV5(`class|${c.title}`)

    const equipmentIds: string[] = []
    for (const key of c.equipment ?? []) {
      const eid = lookups.equipmentByKey.get(key)
      if (eid) equipmentIds.push(eid)
      else errors.push(`${where}: unknown equipment "${key}"`)
    }

    const slots: PlannedSlot[] = []
    c.slots.forEach((s, index) => {
      const slotWhere = `${where}, block "${s.label}"`
      const blockId = lookups.blocksByKey.get(s.block)
      if (!blockId) errors.push(`${slotWhere}: unknown block "${s.block}"`)
      if (s.minExercises !== undefined && !positive(s.minExercises)) {
        errors.push(`${slotWhere}: minExercises must be a positive whole number`)
      }
      const slotId = uuidV5(`slot|${id}|${index}`)
      const items: PlannedSlot['items'] = []
      s.items.forEach((it, position) => {
        const exId = exerciseId(it.exercise, it.equipment)
        if (!lookups.exerciseIds.has(exId)) {
          errors.push(`${slotWhere}: unknown exercise "${it.exercise}" (${it.equipment})`)
        }
        if (it.reps !== undefined && !positive(it.reps)) {
          errors.push(`${slotWhere}: "${it.exercise}" reps must be a positive whole number`)
        }
        if (it.seconds !== undefined && !positive(it.seconds)) {
          errors.push(`${slotWhere}: "${it.exercise}" seconds must be a positive whole number`)
        }
        items.push({
          id: uuidV5(`item|${slotId}|${position}`),
          lesson_slot_id: slotId,
          exercise_id: exId,
          position,
          reps: it.reps ?? null,
          duration_sec: it.seconds ?? null,
          springs: it.springs ?? null,
          notes: it.notes ?? null,
        })
      })
      if (blockId) {
        slots.push({
          id: slotId,
          label: s.label,
          row: {
            id: slotId,
            lesson_id: id,
            block_id: blockId,
            position: index,
            label: s.label,
            is_optional: s.optional ?? false,
            min_exercises: s.minExercises ?? null,
            hint: s.hint ?? null,
          },
          items,
        })
      }
    })

    planned.push({
      id,
      fillExisting: c.id !== undefined,
      lesson: {
        id,
        owner_id: null,
        method_id: lookups.methodId,
        title: c.title,
        notes: c.notes ?? null,
        level: c.level,
        target_duration_min: c.targetDurationMin ?? null,
        status: 'ready',
      },
      equipmentIds,
      slots,
    })
  }

  if (errors.length > 0) throw new Error(`Example class validation failed:\n${errors.join('\n')}`)
  return planned
}

/**
 * Planned time of a class in seconds: each item's own time, else its exercise's time, with the
 * exercise times given by `exerciseSeconds` (exercise id -> seconds).
 */
export function plannedSeconds(
  c: PlannedClass,
  exerciseSeconds: ReadonlyMap<string, number>,
): number {
  return c.slots
    .flatMap((s) => s.items)
    .reduce((sum, i) => sum + (i.duration_sec ?? exerciseSeconds.get(i.exercise_id) ?? 0), 0)
}
