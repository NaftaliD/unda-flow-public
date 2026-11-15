import { describe, expect, it } from 'vitest'
import { blockKeyFromName, slotHintInfo } from './template'

describe('slotHintInfo', () => {
  const base = { hint: null, isOptional: false, minExercises: null }

  it('nudges only when below a minimum of two or more', () => {
    expect(slotHintInfo({ ...base, minExercises: 3 }, 1).belowMin).toBe(3)
    expect(slotHintInfo({ ...base, minExercises: 3 }, 3).belowMin).toBeNull()
    expect(slotHintInfo({ ...base, minExercises: 1 }, 0).belowMin).toBeNull()
    expect(slotHintInfo(base, 0).belowMin).toBeNull()
  })

  it('does not nudge a skipped slot', () => {
    expect(slotHintInfo({ ...base, minExercises: 3, isSkipped: true }, 0).belowMin).toBeNull()
  })

  it('passes the hint and optional flag through, trimming blanks to null', () => {
    expect(slotHintInfo({ ...base, hint: ' Use a series ', isOptional: true }, 0)).toEqual({
      hint: 'Use a series',
      optional: true,
      belowMin: null,
    })
    expect(slotHintInfo({ ...base, hint: '   ' }, 0).hint).toBeNull()
  })
})

describe('blockKeyFromName', () => {
  it('makes a snake_case key', () => {
    expect(blockKeyFromName('My core work!', new Set())).toBe('my_core_work')
  })

  it('keeps non-latin letters and falls back to "block"', () => {
    expect(blockKeyFromName('חימום', new Set())).toBe('חימום')
    expect(blockKeyFromName('!!!', new Set())).toBe('block')
  })

  it('avoids existing keys', () => {
    expect(blockKeyFromName('Core', new Set(['core', 'core_2']))).toBe('core_3')
  })
})
