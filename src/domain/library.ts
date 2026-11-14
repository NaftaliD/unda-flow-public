import { isExerciseAvailable, requirementsToGroups, type Requirement } from './equipment'

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

export function filterExercises(
  list: readonly LibraryExercise[],
  filter: LibraryFilter,
  currentUserId: string | undefined,
): LibraryExercise[] {
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
