import { describe, expect, it } from 'vitest'
import {
  formatDuration,
  formatMinutes,
  itemWarnings,
  lessonDuration,
  moveInList,
  pickerEntries,
  reorderIds,
} from './lesson'
import type { LibraryExercise } from './library'

function ex(over: Partial<LibraryExercise> & { id: string }): LibraryExercise {
  return {
    name: over.id,
    ownerId: null,
    blockId: 'b1',
    level: 'fundamental',
    isArchived: false,
    reviewStatus: 'verified',
    requirements: [],
    ...over,
  }
}

describe('lessonDuration', () => {
  it('sums item durations, falls back to defaults, counts the unknown', () => {
    expect(
      lessonDuration([
        { durationSec: 60, defaultDurationSec: 30 },
        { durationSec: null, defaultDurationSec: 90 },
        { durationSec: null, defaultDurationSec: null },
      ]),
    ).toEqual({ totalSec: 150, missingCount: 1 })
  })

  it('is zero for an empty lesson', () => {
    expect(lessonDuration([])).toEqual({ totalSec: 0, missingCount: 0 })
  })
})

describe('itemWarnings', () => {
  const needsReformer = {
    requirements: [{ equipmentId: 'reformer', altGroup: 0 }],
    isArchived: false,
  }
  it('flags unavailable equipment', () => {
    expect(itemWarnings(needsReformer, new Set())).toEqual(['unavailable'])
    expect(itemWarnings(needsReformer, new Set(['reformer']))).toEqual([])
  })
  it('flags archived exercises', () => {
    expect(itemWarnings({ requirements: [], isArchived: true }, new Set())).toEqual(['archived'])
  })
  it('can flag both', () => {
    expect(itemWarnings({ ...needsReformer, isArchived: true }, new Set())).toEqual([
      'unavailable',
      'archived',
    ])
  })
})

describe('pickerEntries', () => {
  const list = [
    ex({ id: 'a', level: 'fundamental' }),
    ex({ id: 'b', level: 'advanced' }),
    ex({ id: 'c', requirements: [{ equipmentId: 'ring', altGroup: 0 }] }),
    ex({ id: 'd', isArchived: true }),
    ex({ id: 'e', blockId: 'b2' }),
  ]
  const base = {
    lessonLevel: 'intermediate' as const,
    allLevels: false,
    available: new Set<string>(),
    showUnavailable: false,
  }
  const ids = (f: Parameters<typeof pickerEntries>[1]) =>
    pickerEntries(list, f, 'u').map((e) => e.exercise.id)

  it('hides advanced, unavailable and archived by default', () => {
    expect(ids(base)).toEqual(['a', 'e'])
  })
  it('shows all levels when asked', () => {
    expect(ids({ ...base, allLevels: true })).toEqual(['a', 'b', 'e'])
  })
  it('keeps unavailable exercises, flagged, when asked', () => {
    const entries = pickerEntries(list, { ...base, showUnavailable: true }, 'u')
    expect(entries.map((e) => [e.exercise.id, e.available])).toEqual([
      ['a', true],
      ['c', false],
      ['e', true],
    ])
  })
  it('filters by block and search', () => {
    expect(ids({ ...base, blockId: 'b2' })).toEqual(['e'])
    expect(ids({ ...base, search: 'A' })).toEqual(['a'])
  })
})

describe('reordering', () => {
  it('moves an element', () => {
    expect(moveInList(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveInList(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
  })
  it('ignores out-of-range moves', () => {
    expect(moveInList(['a', 'b'], 5, 0)).toEqual(['a', 'b'])
    expect(moveInList(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
  })
  it('reorders ids by active/over', () => {
    expect(reorderIds(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a'])
    expect(reorderIds(['a', 'b', 'c'], 'x', 'c')).toEqual(['a', 'b', 'c'])
  })
})

describe('formatMinutes', () => {
  it('formats minutes and hours', () => {
    expect(formatMinutes(0)).toBe('0m')
    expect(formatMinutes(720)).toBe('12m')
    expect(formatMinutes(3900)).toBe('1h 05m')
  })
})

describe('formatDuration', () => {
  it('shows seconds, minutes, or both', () => {
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(120)).toBe('2m')
    expect(formatDuration(90)).toBe('1m 30s')
  })
})
