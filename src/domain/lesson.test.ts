import { describe, expect, it } from 'vitest'
import {
  formatDuration,
  formatMinutes,
  itemWarnings,
  itemSeconds,
  lessonDuration,
  timeStatus,
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
  it('sums item durations and falls back to the exercise time', () => {
    expect(itemSeconds({ durationSec: 60, defaultDurationSec: 30 })).toBe(60)
    expect(itemSeconds({ durationSec: null, defaultDurationSec: 90 })).toBe(90)
    expect(
      lessonDuration([
        { durationSec: 60, defaultDurationSec: 30 },
        { durationSec: null, defaultDurationSec: 90 },
      ]),
    ).toEqual({ totalSec: 150 })
  })

  it('is zero for an empty class', () => {
    expect(lessonDuration([])).toEqual({ totalSec: 0 })
  })
})

describe('timeStatus', () => {
  it('says how much is left', () => {
    expect(timeStatus(32 * 60, 45)).toEqual({
      usedMin: 32,
      targetMin: 45,
      leftMin: 13,
      overMin: 0,
      state: 'under',
      fraction: 32 / 45,
    })
  })

  it('is full at exactly the class length', () => {
    expect(timeStatus(45 * 60, 45)).toMatchObject({
      state: 'full',
      leftMin: 0,
      overMin: 0,
      fraction: 1,
    })
  })

  it('says by how much it is overbooked, and caps the bar', () => {
    expect(timeStatus(50 * 60, 45)).toMatchObject({
      state: 'over',
      leftMin: 0,
      overMin: 5,
      fraction: 1,
    })
  })

  it('rounds to whole minutes', () => {
    expect(timeStatus(44 * 60 + 40, 45)).toMatchObject({ usedMin: 45, state: 'full' })
  })

  it('has nothing to compare without a class length', () => {
    expect(timeStatus(600, null)).toMatchObject({ usedMin: 10, state: 'none', targetMin: null })
    expect(timeStatus(600, 0).state).toBe('none')
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
