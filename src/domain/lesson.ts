import { isExerciseAvailable, type Requirement } from './equipment'
import { filterExercises, LEVELS, type Level, type LibraryExercise } from './library'

export type DurationItem = { durationSec: number | null; defaultDurationSec: number | null }

/** Sum of item durations (falling back to the exercise default); items with neither are counted. */
export function lessonDuration(items: readonly DurationItem[]): {
  totalSec: number
  missingCount: number
} {
  let totalSec = 0
  let missingCount = 0
  for (const i of items) {
    const sec = i.durationSec ?? i.defaultDurationSec
    if (sec === null) missingCount += 1
    else totalSec += sec
  }
  return { totalSec, missingCount }
}

export type ItemWarning = 'unavailable' | 'archived'

/** Warnings for an item already in a lesson. Items are kept, never removed silently. */
export function itemWarnings(
  exercise: { requirements: readonly Requirement[]; isArchived: boolean },
  available: ReadonlySet<string>,
): ItemWarning[] {
  const out: ItemWarning[] = []
  if (!isExerciseAvailable(exercise.requirements, available)) out.push('unavailable')
  if (exercise.isArchived) out.push('archived')
  return out
}

export type PickerFilter = {
  search?: string
  blockId?: string
  lessonLevel: Level
  /** false (default): only exercises at or below the lesson level. */
  allLevels: boolean
  available: ReadonlySet<string>
  /** false (default): hide exercises the equipment cannot support. true: keep them (greyed). */
  showUnavailable: boolean
}

export type PickerEntry<T> = { exercise: T; available: boolean }

/** Exercises for the "Add exercise" picker. Archived exercises are never offered. */
export function pickerEntries<T extends LibraryExercise>(
  list: readonly T[],
  filter: PickerFilter,
  currentUserId: string | undefined,
): PickerEntry<T>[] {
  const maxRank = LEVELS.indexOf(filter.lessonLevel)
  return filterExercises(
    list,
    { search: filter.search, blockId: filter.blockId, scope: 'all' },
    currentUserId,
  )
    .filter((e) => filter.allLevels || LEVELS.indexOf(e.level) <= maxRank)
    .map((exercise) => ({
      exercise,
      available: isExerciseAvailable(exercise.requirements, filter.available),
    }))
    .filter((e) => filter.showUnavailable || e.available)
}

/** Move the element at `from` to index `to` (non-mutating). Out-of-range indexes return a copy. */
export function moveInList<T>(list: readonly T[], from: number, to: number): T[] {
  const out = [...list]
  if (from < 0 || from >= out.length || to < 0 || to >= out.length) return out
  const [item] = out.splice(from, 1)
  out.splice(to, 0, item!)
  return out
}

/** Ids in their new order after dragging `activeId` over `overId`. */
export function reorderIds(ids: readonly string[], activeId: string, overId: string): string[] {
  return moveInList(ids, ids.indexOf(activeId), ids.indexOf(overId))
}

/** Format seconds as "1h 05m" / "12m" / "0m". */
export function formatMinutes(totalSec: number): string {
  const minutes = Math.round(totalSec / 60)
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  return `${h}h ${String(minutes % 60).padStart(2, '0')}m`
}

/** Format an exercise duration: "45s", "2m", "1m 30s". */
export function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}s`
  const m = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return sec === 0 ? `${m}m` : `${m}m ${sec}s`
}
