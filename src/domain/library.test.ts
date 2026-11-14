import { describe, expect, it } from 'vitest'
import { describeRequirements, filterExercises, type LibraryExercise } from './library'

const ex = (over: Partial<LibraryExercise>): LibraryExercise => ({
  id: 'x',
  name: 'Footwork',
  ownerId: null,
  blockId: 'b1',
  level: 'fundamental',
  isArchived: false,
  reviewStatus: 'verified',
  requirements: [],
  ...over,
})

const list = [
  ex({ id: '1', name: 'Pelvic Curl', requirements: [{ equipmentId: 'mat', altGroup: 0 }] }),
  ex({
    id: '2',
    name: 'Short Box Tilt',
    blockId: 'b2',
    level: 'intermediate',
    requirements: [
      { equipmentId: 'reformer', altGroup: 0 },
      { equipmentId: 'box', altGroup: 1 },
    ],
  }),
  ex({ id: '3', name: 'My Hundred', ownerId: 'me', level: 'advanced' }),
  ex({ id: '4', name: 'Old one', ownerId: 'me', isArchived: true }),
]

const ids = (r: LibraryExercise[]) => r.map((e) => e.id)

describe('filterExercises', () => {
  it('hides archived by default and shows them on request', () => {
    expect(ids(filterExercises(list, {}, 'me'))).toEqual(['1', '2', '3'])
    expect(ids(filterExercises(list, { showArchived: true }, 'me'))).toEqual(['1', '2', '3', '4'])
  })

  it('searches names case-insensitively', () => {
    expect(ids(filterExercises(list, { search: 'BOX' }, 'me'))).toEqual(['2'])
  })

  it('filters by block and level', () => {
    expect(ids(filterExercises(list, { blockId: 'b2' }, 'me'))).toEqual(['2'])
    expect(ids(filterExercises(list, { level: 'advanced' }, 'me'))).toEqual(['3'])
  })

  it('filters by scope', () => {
    expect(ids(filterExercises(list, { scope: 'shared' }, 'me'))).toEqual(['1', '2'])
    expect(ids(filterExercises(list, { scope: 'mine' }, 'me'))).toEqual(['3'])
  })

  it('filters by available equipment', () => {
    expect(ids(filterExercises(list, { available: new Set(['reformer']) }, 'me'))).toEqual(['3'])
    expect(ids(filterExercises(list, { available: new Set(['reformer', 'box']) }, 'me'))).toEqual([
      '2',
      '3',
    ])
  })
})

describe('describeRequirements', () => {
  it('joins groups with + and alternatives with /', () => {
    const names: Record<string, string> = { reformer: 'Reformer', ball: 'Ball', ring: 'Ring' }
    expect(
      describeRequirements(
        [
          { equipmentId: 'reformer', altGroup: 0 },
          { equipmentId: 'ball', altGroup: 1 },
          { equipmentId: 'ring', altGroup: 1 },
        ],
        (id) => names[id] ?? id,
      ),
    ).toBe('Reformer + Ball / Ring')
  })
})
