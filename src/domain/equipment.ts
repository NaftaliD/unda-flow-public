export type Requirement = { equipmentId: string; altGroup: number }
export type KeyedRequirement = { equipmentKey: string; altGroup: number }

/**
 * Available when every alt_group has at least one item in the available set.
 * An exercise with no requirements is always available.
 */
export function isExerciseAvailable(
  requirements: readonly Requirement[],
  available: ReadonlySet<string>,
): boolean {
  return missingEquipment(requirements, available).length === 0
}

/**
 * Groups that no available item satisfies, each as the equipment ids that would.
 * Feeds the "missing: ..." hint (one entry per unmet group).
 */
export function missingEquipment(
  requirements: readonly Requirement[],
  available: ReadonlySet<string>,
): string[][] {
  return requirementsToGroups(requirements).filter((ids) => !ids.some((id) => available.has(id)))
}

/** Requirement rows -> groups of equipment ids, ordered by alt_group. */
export function requirementsToGroups(requirements: readonly Requirement[]): string[][] {
  const byGroup = new Map<number, string[]>()
  for (const r of requirements) {
    const list = byGroup.get(r.altGroup) ?? []
    list.push(r.equipmentId)
    byGroup.set(r.altGroup, list)
  }
  return [...byGroup.entries()].sort(([a], [b]) => a - b).map(([, ids]) => ids)
}

/** Groups of equipment ids -> requirement rows. Empty groups are dropped and groups renumbered from 0. */
export function groupsToRequirements(groups: readonly (readonly string[])[]): Requirement[] {
  const out: Requirement[] = []
  let altGroup = 0
  for (const group of groups) {
    const ids = [...new Set(group)]
    if (ids.length === 0) continue
    for (const equipmentId of ids) out.push({ equipmentId, altGroup })
    altGroup += 1
  }
  return out
}

/**
 * Parse the seed CSV equipment column: `+` separates required groups, `|` separates
 * alternatives within a group. "reformer+box" = reformer AND box; "mat|reformer" = either.
 */
export function parseEquipmentSpec(spec: string): KeyedRequirement[] {
  const out: KeyedRequirement[] = []
  const groups = spec
    .split('+')
    .map((g) => g.trim())
    .filter(Boolean)
  groups.forEach((group, altGroup) => {
    const keys = group
      .split('|')
      .map((k) => k.trim())
      .filter(Boolean)
    for (const equipmentKey of new Set(keys)) out.push({ equipmentKey, altGroup })
  })
  return out
}
