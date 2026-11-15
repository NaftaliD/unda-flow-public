import { describe, expect, it } from 'vitest'
import { seriesAvailability } from './series'

const ex = (
  id: string,
  requirements: { equipmentId: string; altGroup: number }[],
  isArchived = false,
) => [id, { id, isArchived, requirements }] as const

const byId = new Map([
  ex('a', [{ equipmentId: 'reformer', altGroup: 0 }]),
  ex('b', [
    { equipmentId: 'reformer', altGroup: 0 },
    { equipmentId: 'ball', altGroup: 1 },
    { equipmentId: 'ring', altGroup: 1 },
  ]),
  ex('c', [{ equipmentId: 'reformer', altGroup: 0 }], true),
  ex('d', []),
])

describe('seriesAvailability', () => {
  it('is available when every addable exercise is supported', () => {
    expect(seriesAvailability(['a', 'd'], byId, new Set(['reformer']))).toEqual({
      addable: 2,
      available: true,
      missing: [],
    })
  })

  it('names the missing equipment once, as alternatives', () => {
    const r = seriesAvailability(['a', 'b', 'b'], byId, new Set(['reformer']))
    expect(r.available).toBe(false)
    expect(r.missing).toEqual([['ball', 'ring']])
  })

  it('skips archived and unknown exercises', () => {
    const r = seriesAvailability(['c', 'zzz', 'd'], byId, new Set())
    expect(r).toEqual({ addable: 1, available: true, missing: [] })
  })
})
