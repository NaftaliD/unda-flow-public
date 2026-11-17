import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildExamples, plannedSeconds, type ExampleFile } from './build-examples.ts'
import { buildImport, exerciseId } from './build-import.ts'

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')

// The block time estimates (seconds per exercise) from the time migration.
const BLOCK_SECONDS: Record<string, number> = {
  warm_up: 90,
  foot_work: 45,
  abdominal: 180,
  hip_work: 120,
  stretch: 120,
  spinal_articulation: 120,
  fbi: 180,
  leg_work: 120,
  lateral_rotation: 120,
  arm_work: 60,
  back_extension: 120,
}
const blocksByKey = new Map(Object.keys(BLOCK_SECONDS).map((k) => [k, `b-${k}`]))
const equipmentByKey = new Map(
  ['reformer', 'cadillac', 'chair', 'barrel', 'mat', 'box', 'ball', 'ring', 'band', 'weights'].map(
    (k) => [k, `e-${k}`],
  ),
)
const importLookups = { methodId: 'm', blocksByKey, equipmentByKey }

/** Exercise ids and their default times, from the CSV files given. */
function exercisesFrom(paths: string[]) {
  const seconds = new Map<string, number>()
  const names = new Map<string, string>()
  for (const p of paths) {
    for (const e of buildImport(read(p), importLookups).exercises) {
      const key = [...blocksByKey].find(([, id]) => id === e.block_id)![0]
      seconds.set(e.id, BLOCK_SECONDS[key]!)
      names.set(e.id, e.name)
    }
  }
  return { seconds, ids: new Set(seconds.keys()) }
}

function plan(file: ExampleFile, ids: ReadonlySet<string>) {
  return buildExamples(file, { methodId: 'm', blocksByKey, equipmentByKey, exerciseIds: ids })
}

const minutes = (sec: number) => sec / 60

describe('buildExamples', () => {
  const ex = exerciseId('Frog', 'reformer')
  const ids = new Set([ex])
  const base = {
    title: 'T',
    level: 'fundamental',
    equipment: ['reformer'],
    slots: [
      {
        block: 'hip_work',
        label: 'Hip work',
        items: [{ exercise: 'Frog', equipment: 'reformer', reps: 8 }],
      },
    ],
  }

  it('plans a class with slots, items and deterministic ids', () => {
    const [c] = plan({ classes: [base] }, ids)
    expect(c?.lesson).toMatchObject({ owner_id: null, title: 'T', status: 'ready' })
    expect(c?.slots).toHaveLength(1)
    expect(c?.slots[0]?.items[0]).toMatchObject({ exercise_id: ex, position: 0, reps: 8 })
    const [again] = plan({ classes: [base] }, ids)
    expect(again?.id).toBe(c?.id)
    expect(again?.slots[0]?.items[0]?.id).toBe(c?.slots[0]?.items[0]?.id)
    expect(c?.fillExisting).toBe(false)
  })

  it('treats a definition with an id as filling that class', () => {
    const [c] = plan({ classes: [{ ...base, id: 'fixed-id' }] }, ids)
    expect(c).toMatchObject({ id: 'fixed-id', fillExisting: true })
  })

  it('reports every problem at once', () => {
    expect(() =>
      plan(
        {
          classes: [
            {
              ...base,
              level: 'expert',
              equipment: ['sofa'],
              slots: [
                { block: 'nope', label: 'X', items: [] },
                {
                  block: 'hip_work',
                  label: 'Y',
                  items: [{ exercise: 'Ghost', equipment: 'mat', reps: 0 }],
                },
              ],
            },
          ],
        },
        ids,
      ),
    ).toThrow(
      /unknown level "expert"[\s\S]*unknown equipment "sofa"[\s\S]*unknown block "nope"[\s\S]*unknown exercise "Ghost"[\s\S]*reps must be/,
    )
  })

  it("adds an item's own time over the exercise's", () => {
    const [c] = plan(
      {
        classes: [
          {
            ...base,
            slots: [
              {
                block: 'hip_work',
                label: 'Hip work',
                items: [
                  { exercise: 'Frog', equipment: 'reformer', seconds: 300 },
                  { exercise: 'Frog', equipment: 'reformer' },
                ],
              },
            ],
          },
        ],
      },
      ids,
    )
    expect(plannedSeconds(c!, new Map([[ex, 120]]))).toBe(300 + 120)
  })
})

describe('the committed example classes', () => {
  const csvs = ['supabase/seed/exercises.sample.csv', 'supabase/seed/example-exercises.csv']
  const { seconds, ids } = exercisesFrom(csvs)

  it('the new example exercises are valid, described, and need review', () => {
    const { exercises } = buildImport(read('supabase/seed/example-exercises.csv'), importLookups)
    expect(exercises.length).toBeGreaterThanOrEqual(30)
    for (const e of exercises) {
      expect(e.description, e.name).toBeTruthy()
      expect(e.cues, e.name).toBeTruthy()
      expect(e.review_status).toBe('needs_review')
    }
    // Mat exercises need only the mat; ball exercises need the reformer and the ball.
    const requirements = buildImport(
      read('supabase/seed/example-exercises.csv'),
      importLookups,
    ).requirements
    const ballIds = new Set(
      requirements.filter((r) => r.equipment_id === 'e-ball').map((r) => r.exercise_id),
    )
    expect(ballIds.size).toBeGreaterThanOrEqual(14)
    for (const id of ballIds) {
      expect(
        requirements.some((r) => r.exercise_id === id && r.equipment_id === 'e-reformer'),
      ).toBe(true)
    }
  })

  it.each([
    ['supabase/seed/example-classes.sample.json', 'the sample apparatus class', 1],
    ['supabase/seed/example-classes.json', 'the mat and ball classes', 2],
  ])('%s (%s) only uses exercises that exist', (file, _label, count) => {
    const planned = plan(JSON.parse(read(file)) as ExampleFile, ids)
    expect(planned).toHaveLength(count)
  })

  it('the mat and ball classes are about 45 minutes and use the equipment they say', () => {
    const planned = plan(JSON.parse(read('supabase/seed/example-classes.json')) as ExampleFile, ids)
    expect(planned.map((c) => c.lesson.title)).toEqual([
      'Classic mat class - 45 min',
      'Reformer and ball class - 45 min',
    ])
    for (const c of planned) {
      const min = minutes(plannedSeconds(c, seconds))
      expect(min, `${c.lesson.title}: ${min} min`).toBeGreaterThanOrEqual(42)
      expect(min, `${c.lesson.title}: ${min} min`).toBeLessThanOrEqual(48)
      expect(c.lesson.target_duration_min).toBe(45)
    }
  })

  const privatePath = 'supabase/seed/private/example-class-apparatus.json'
  const privateCsv = 'supabase/seed/private/exercises.block.csv'
  it.skipIf(
    !existsSync(resolve(process.cwd(), privatePath)) ||
      !existsSync(resolve(process.cwd(), privateCsv)),
  )('the private apparatus class fills the seeded 12-block class and is about 45 minutes', () => {
    const real = exercisesFrom([privateCsv])
    const [c] = plan(JSON.parse(read(privatePath)) as ExampleFile, real.ids)
    expect(c?.id).toBe('5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01')
    expect(c?.fillExisting).toBe(true)
    expect(c?.slots.map((s) => s.label)).toEqual([
      'Warm-up',
      'Foot work',
      'Abdominal',
      'Hip work',
      'Stretch',
      'Articulation',
      'FBI 1',
      'Extra leg',
      'Lateral / rotation',
      'FBI 2',
      'Arm work',
      'Back extension',
    ])
    const min = minutes(plannedSeconds(c!, real.seconds))
    expect(min).toBeGreaterThanOrEqual(42)
    expect(min).toBeLessThanOrEqual(48)
  })
})
