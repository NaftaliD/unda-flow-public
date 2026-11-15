import { isExerciseAvailable, missingEquipment, type Requirement } from './equipment'

type SeriesExercise = { id: string; isArchived: boolean; requirements: readonly Requirement[] }

export type SeriesAvailability = {
  /** Exercises that would be added (archived ones are skipped). */
  addable: number
  /** True when the equipment supports every addable exercise. */
  available: boolean
  /** Missing equipment across the series: one entry per distinct group of alternatives. */
  missing: string[][]
}

/** Whether a series fits today's equipment, and what is missing when it does not. */
export function seriesAvailability(
  exerciseIds: readonly string[],
  exerciseById: ReadonlyMap<string, SeriesExercise>,
  available: ReadonlySet<string>,
): SeriesAvailability {
  const seen = new Set<string>()
  const missing: string[][] = []
  let addable = 0
  let ok = true
  for (const id of exerciseIds) {
    const ex = exerciseById.get(id)
    if (!ex || ex.isArchived) continue
    addable += 1
    if (!isExerciseAvailable(ex.requirements, available)) {
      ok = false
      for (const group of missingEquipment(ex.requirements, available)) {
        const key = [...group].sort().join('|')
        if (!seen.has(key)) {
          seen.add(key)
          missing.push(group)
        }
      }
    }
  }
  return { addable, available: ok, missing }
}
