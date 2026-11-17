import { describe, expect, it } from 'vitest'
import { blockStarts, moveStep, teachSteps, type TeachSlot } from './teach'

const item = (id: string, over: Partial<TeachSlot['items'][number]> = {}) => ({
  id,
  exerciseId: `x-${id}`,
  reps: null,
  durationSec: null,
  springs: null,
  notes: null,
  ...over,
})
const slot = (id: string, items: TeachSlot['items'], over: Partial<TeachSlot> = {}): TeachSlot => ({
  id,
  label: id.toUpperCase(),
  isSkipped: false,
  notes: null,
  hint: null,
  items,
  ...over,
})

const slots: TeachSlot[] = [
  slot('a', [item('1'), item('2', { reps: 8, springs: '1 red' })], { notes: 'Warm gently' }),
  slot('b', [], {}), // empty: not taught
  slot('c', [item('3')], { isSkipped: true }), // skipped: not taught
  slot('d', [item('4'), item('5'), item('6')], { hint: 'A whole series' }),
]

describe('teachSteps', () => {
  const steps = teachSteps(slots)

  it('is one step per exercise, in order, skipping skipped and empty blocks', () => {
    expect(steps.map((s) => s.itemId)).toEqual(['1', '2', '4', '5', '6'])
  })

  it('numbers the taught blocks and the exercises in each', () => {
    expect(steps[0]).toMatchObject({
      blockIndex: 0,
      blockCount: 2,
      indexInBlock: 0,
      countInBlock: 2,
    })
    expect(steps[2]).toMatchObject({ blockLabel: 'D', blockIndex: 1, countInBlock: 3 })
    expect(steps[4]).toMatchObject({ indexInBlock: 2 })
  })

  it("shows a block's notes and hint with its first exercise only", () => {
    expect(steps[0]).toMatchObject({ blockNotes: 'Warm gently', blockHint: null })
    expect(steps[1]?.blockNotes).toBeNull()
    expect(steps[2]).toMatchObject({ blockHint: 'A whole series' })
    expect(steps[3]?.blockHint).toBeNull()
  })

  it("carries each item's own settings", () => {
    expect(steps[1]).toMatchObject({ reps: 8, springs: '1 red' })
  })

  it('is empty for a class with nothing to teach', () => {
    expect(teachSteps([])).toEqual([])
    expect(teachSteps([slot('x', [item('1')], { isSkipped: true })])).toEqual([])
  })
})

describe('blockStarts', () => {
  it('lists where each taught block begins', () => {
    expect(blockStarts(teachSteps(slots))).toEqual([
      { slotId: 'a', label: 'A', index: 0 },
      { slotId: 'd', label: 'D', index: 2 },
    ])
  })
})

describe('moveStep', () => {
  it('stays inside the class, with one extra position for "finished"', () => {
    expect(moveStep(0, -1, 5)).toBe(0)
    expect(moveStep(2, 1, 5)).toBe(3)
    expect(moveStep(4, 1, 5)).toBe(5)
    expect(moveStep(5, 1, 5)).toBe(5)
    expect(moveStep(3, -2, 5)).toBe(1)
  })
})
