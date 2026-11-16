import { describe, expect, it } from 'vitest'
import { exerciseFormSchema, lessonFormSchema } from './schemas'

const base = {
  name: 'Pelvic Curl',
  blockId: 'b1',
  level: 'fundamental' as const,
  groups: [],
  defaultDurationSec: 90,
}

describe('exerciseFormSchema', () => {
  it('accepts a minimal exercise with no equipment', () => {
    expect(exerciseFormSchema.safeParse(base).success).toBe(true)
  })

  it('requires a time: every exercise has one', () => {
    expect(exerciseFormSchema.safeParse({ ...base, defaultDurationSec: undefined }).success).toBe(
      false,
    )
    expect(exerciseFormSchema.safeParse({ ...base, defaultDurationSec: '' }).success).toBe(false)
    expect(exerciseFormSchema.safeParse({ ...base, defaultDurationSec: 0 }).success).toBe(false)
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

describe('lessonFormSchema', () => {
  const ok = {
    title: 'Monday class',
    lessonDate: '2026-11-16',
    level: 'intermediate' as const,
    targetDurationMin: '55',
    equipmentIds: ['r'],
  }
  it('accepts a valid lesson and coerces the target', () => {
    const r = lessonFormSchema.safeParse(ok)
    expect(r.success && r.data.targetDurationMin).toBe(55)
  })
  it('allows an empty target', () => {
    expect(lessonFormSchema.safeParse({ ...ok, targetDurationMin: '' }).success).toBe(true)
  })
  it('rejects a blank title and a non-positive target', () => {
    expect(lessonFormSchema.safeParse({ ...ok, title: '  ' }).success).toBe(false)
    expect(lessonFormSchema.safeParse({ ...ok, targetDurationMin: '0' }).success).toBe(false)
  })
})
