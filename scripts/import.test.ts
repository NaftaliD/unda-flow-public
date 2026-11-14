import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildImport, uuidV5 } from './build-import.ts'
import { parseCsv, parseCsvObjects } from './csv.ts'

const lookups = {
  methodId: 'm1',
  blocksByKey: new Map([
    ['warm_up', 'b-warm'],
    ['foot_work', 'b-foot'],
    ['abdominal', 'b-abs'],
  ]),
  equipmentByKey: new Map([
    ['mat', 'e-mat'],
    ['reformer', 'e-ref'],
    ['box', 'e-box'],
  ]),
}

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, commas and CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
    ])
  })

  it('maps rows to header names and skips blank lines', () => {
    expect(parseCsvObjects('n,l\nA,1\n\nB,2')).toEqual([
      { n: 'A', l: '1' },
      { n: 'B', l: '2' },
    ])
  })
})

describe('uuidV5', () => {
  it('is deterministic and well formed', () => {
    const a = uuidV5('Frog|reformer')
    expect(a).toBe(uuidV5('Frog|reformer'))
    expect(a).not.toBe(uuidV5('Frog|cadillac'))
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})

describe('buildImport', () => {
  const header = 'name,block_key,equipment,level,series\n'

  it('builds exercises and AND-of-OR requirements', () => {
    const { exercises, requirements } = buildImport(
      `${header}Tilt,abdominal,reformer+box,intermediate,Short box\nCurl,warm_up,mat|reformer,fundamental,\n`,
      lookups,
    )
    expect(exercises).toHaveLength(2)
    expect(exercises[0]).toMatchObject({ block_id: 'b-abs', level: 'intermediate', owner_id: null })
    expect(exercises[0]?.review_status).toBe('needs_review')
    expect(requirements.filter((r) => r.exercise_id === exercises[0]?.id)).toEqual([
      { exercise_id: exercises[0]?.id, equipment_id: 'e-ref', alt_group: 0 },
      { exercise_id: exercises[0]?.id, equipment_id: 'e-box', alt_group: 1 },
    ])
    expect(requirements.filter((r) => r.exercise_id === exercises[1]?.id)).toHaveLength(2)
  })

  it('reports every problem at once and writes nothing', () => {
    expect(() =>
      buildImport(
        `${header}A,nope,mat,fundamental,\nB,warm_up,sofa,fundamental,\nC,warm_up,mat,expert,\n`,
        lookups,
      ),
    ).toThrow(/unknown block "nope"[\s\S]*unknown equipment "sofa"[\s\S]*unknown level "expert"/)
  })

  it('rejects the same name and equipment twice but allows the same name on different equipment', () => {
    expect(() =>
      buildImport(`${header}A,warm_up,mat,fundamental,\nA,warm_up,mat,fundamental,\n`, lookups),
    ).toThrow(/duplicate/)
    expect(
      buildImport(`${header}A,warm_up,mat,fundamental,\nA,warm_up,reformer,fundamental,\n`, lookups)
        .exercises,
    ).toHaveLength(2)
  })

  it('accepts the real seed file', () => {
    const csv = readFileSync(resolve(process.cwd(), 'supabase/seed/exercises.block.csv'), 'utf8')
    const all = new Map(
      [
        'warm_up',
        'foot_work',
        'abdominal',
        'hip_work',
        'stretch',
        'spinal_articulation',
        'fbi',
        'leg_work',
        'lateral_rotation',
        'arm_work',
        'back_extension',
      ].map((k) => [k, `b-${k}`]),
    )
    const eq = new Map(['reformer', 'cadillac', 'chair', 'box', 'mat'].map((k) => [k, `e-${k}`]))
    const { exercises } = buildImport(csv, { methodId: 'm', blocksByKey: all, equipmentByKey: eq })
    expect(exercises).toHaveLength(117)
  })
})
