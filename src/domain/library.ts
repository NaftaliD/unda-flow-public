import {
  isExerciseAvailable,
  optionalEquipmentIds,
  requirementsToGroups,
  type Requirement,
} from './equipment'

export type Level = 'fundamental' | 'intermediate' | 'advanced'
export const LEVELS: readonly Level[] = ['fundamental', 'intermediate', 'advanced']

export type LibraryExercise = {
  id: string
  name: string
  ownerId: string | null
  blockId: string
  level: Level
  isArchived: boolean
  reviewStatus: 'needs_review' | 'verified'
  requirements: Requirement[]
}

export type LibraryFilter = {
  search?: string
  blockId?: string
  level?: Level
  /** Equipment ids available today. undefined = do not filter by equipment. */
  available?: ReadonlySet<string>
  scope?: 'all' | 'shared' | 'mine'
  showArchived?: boolean
}

export function filterExercises<T extends LibraryExercise>(
  list: readonly T[],
  filter: LibraryFilter,
  currentUserId: string | undefined,
): T[] {
  const search = filter.search?.trim().toLowerCase()
  return list.filter((e) => {
    if (!filter.showArchived && e.isArchived) return false
    if (search && !e.name.toLowerCase().includes(search)) return false
    if (filter.blockId && e.blockId !== filter.blockId) return false
    if (filter.level && e.level !== filter.level) return false
    if (filter.scope === 'shared' && e.ownerId !== null) return false
    if (filter.scope === 'mine' && (e.ownerId === null || e.ownerId !== currentUserId)) return false
    if (filter.available && !isExerciseAvailable(e.requirements, filter.available)) return false
    return true
  })
}

/** Groups for display, e.g. [['reformer'],['ball','ring']] -> "Reformer + Ball / Ring". */
export function describeRequirements(
  requirements: readonly Requirement[],
  nameOf: (equipmentId: string) => string,
): string {
  return requirementsToGroups(requirements)
    .map((ids) => ids.map(nameOf).join(' / '))
    .join(' + ')
}

/** "Ring, Band" for the bonus accessories of an exercise ('' when there are none). */
export function describeBonus(
  requirements: readonly Requirement[],
  nameOf: (equipmentId: string) => string,
): string {
  return optionalEquipmentIds(requirements).map(nameOf).join(', ')
}

export type MovementGroup<T> = { key: string; name: string; variants: T[] }

/**
 * Merge rows of the same movement (same name within the same block) done on different
 * apparatus into one entry. First-seen order is kept for groups and for variants.
 */
export function groupByMovement<T extends { name: string; blockId: string }>(
  list: readonly T[],
): MovementGroup<T>[] {
  const groups = new Map<string, MovementGroup<T>>()
  for (const e of list) {
    const key = `${e.blockId}|${e.name.trim().toLowerCase()}`
    const group = groups.get(key)
    if (group) group.variants.push(e)
    else groups.set(key, { key, name: e.name, variants: [e] })
  }
  return [...groups.values()]
}
