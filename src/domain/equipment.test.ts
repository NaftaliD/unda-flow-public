import { describe, expect, it } from 'vitest'
import {
  groupsToRequirements,
  isExerciseAvailable,
  missingEquipment,
  optionalEquipmentIds,
  parseEquipmentSpec,
  requirementsToGroups,
} from './equipment'

const set = (...ids: string[]) => new Set(ids)

describe('isExerciseAvailable', () => {
  it('is always available with no requirements', () => {
    expect(isExerciseAvailable([], set())).toBe(true)
  })

  it('needs every group satisfied (AND of ORs)', () => {
    const reqs = [
      { equipmentId: 'reformer', altGroup: 0 },
      { equipmentId: 'ball', altGroup: 1 },
      { equipmentId: 'ring', altGroup: 1 },
    ]
    expect(isExerciseAvailable(reqs, set('reformer', 'ring'))).toBe(true)
    expect(isExerciseAvailable(reqs, set('reformer', 'ball', 'ring'))).toBe(true)
    expect(isExerciseAvailable(reqs, set('reformer'))).toBe(false)
    expect(isExerciseAvailable(reqs, set('ball', 'ring'))).toBe(false)
  })

  it('treats alternatives in one group as any-of', () => {
    const reqs = [
      { equipmentId: 'mat', altGroup: 0 },
      { equipmentId: 'reformer', altGroup: 0 },
    ]
    expect(isExerciseAvailable(reqs, set('reformer'))).toBe(true)
    expect(isExerciseAvailable(reqs, set('chair'))).toBe(false)
  })
})

describe('missingEquipment', () => {
  it('lists the unmet groups only', () => {
    const reqs = [
      { equipmentId: 'reformer', altGroup: 0 },
      { equipmentId: 'ball', altGroup: 1 },
      { equipmentId: 'ring', altGroup: 1 },
    ]
    expect(missingEquipment(reqs, set('reformer'))).toEqual([['ball', 'ring']])
    expect(missingEquipment(reqs, set('reformer', 'ball'))).toEqual([])
  })
})

describe('groups <-> requirements', () => {
  it('round-trips and renumbers, dropping empty groups', () => {
    const reqs = groupsToRequirements([['a', 'b'], [], ['c']])
    expect(reqs).toEqual([
      { equipmentId: 'a', altGroup: 0 },
      { equipmentId: 'b', altGroup: 0 },
      { equipmentId: 'c', altGroup: 1 },
    ])
    expect(requirementsToGroups(reqs)).toEqual([['a', 'b'], ['c']])
  })
})

describe('parseEquipmentSpec', () => {
  it('parses a single item', () => {
    expect(parseEquipmentSpec('reformer')).toEqual([{ equipmentKey: 'reformer', altGroup: 0 }])
  })

  it('parses alternatives as one group', () => {
    expect(parseEquipmentSpec('mat|reformer|cadillac')).toEqual([
      { equipmentKey: 'mat', altGroup: 0 },
      { equipmentKey: 'reformer', altGroup: 0 },
      { equipmentKey: 'cadillac', altGroup: 0 },
    ])
  })

  it('parses + as separate required groups', () => {
    expect(parseEquipmentSpec('reformer+box')).toEqual([
      { equipmentKey: 'reformer', altGroup: 0 },
      { equipmentKey: 'box', altGroup: 1 },
    ])
  })

  it('combines both', () => {
    expect(parseEquipmentSpec('reformer+ball|ring')).toEqual([
      { equipmentKey: 'reformer', altGroup: 0 },
      { equipmentKey: 'ball', altGroup: 1 },
      { equipmentKey: 'ring', altGroup: 1 },
    ])
  })

  it('returns nothing for an empty spec', () => {
    expect(parseEquipmentSpec('')).toEqual([])
  })
})

describe('bonus (optional) accessories', () => {
  const reqs = [
    { equipmentId: 'reformer', altGroup: 0 },
    { equipmentId: 'ring', altGroup: 0, optional: true },
  ]
  it('never decide availability', () => {
    expect(isExerciseAvailable(reqs, new Set(['reformer']))).toBe(true)
    expect(isExerciseAvailable(reqs, new Set(['ring']))).toBe(false)
  })
  it('are left out of the required groups and missing list', () => {
    expect(requirementsToGroups(reqs)).toEqual([['reformer']])
    expect(missingEquipment(reqs, new Set(['reformer']))).toEqual([])
  })
  it('are listed separately', () => {
    expect(optionalEquipmentIds(reqs)).toEqual(['ring'])
  })
})
