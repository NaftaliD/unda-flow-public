import { describe, expect, it } from 'vitest'
import { exerciseFormSchema } from './schemas'

const base = { name: 'Pelvic Curl', blockId: 'b1', level: 'fundamental' as const, groups: [] }

describe('exerciseFormSchema', () => {
  it('accepts a minimal exercise with no equipment', () => {
    expect(exerciseFormSchema.safeParse(base).success).toBe(true)
  })

  it('rejects an empty name', () => {
    expect(exerciseFormSchema.safeParse({ ...base, name: '   ' }).success).toBe(false)
  })

  it('rejects an empty equipment group', () => {
    expect(exerciseFormSchema.safeParse({ ...base, groups: [[]] }).success).toBe(false)
  })

  it('treats blank numbers as unset and coerces strings', () => {
    const r = exerciseFormSchema.parse({ ...base, defaultReps: '', defaultDurationSec: '30' })
    expect(r.defaultReps).toBeUndefined()
    expect(r.defaultDurationSec).toBe(30)
  })

  it('rejects non-positive reps', () => {
    expect(exerciseFormSchema.safeParse({ ...base, defaultReps: 0 }).success).toBe(false)
  })

  it('rejects an unknown level', () => {
    expect(exerciseFormSchema.safeParse({ ...base, level: 'expert' }).success).toBe(false)
  })
})
