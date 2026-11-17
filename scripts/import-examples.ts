/**
 * Imports example classes (shared classes people start new classes from) from JSON files.
 * Run locally with the SECRET key; it never belongs in the client, CI secrets or Cloudflare.
 *
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=sb_secret_... npm run db:import-examples
 *   npm run db:import-examples -- supabase/seed/example-classes.json supabase/seed/private/example-class-apparatus.json
 *
 * With no file arguments it imports the committed dev/CI set (the sample apparatus class and the
 * classic mat and reformer + ball classes). Every class is validated before anything is written.
 *
 * Insert-only: a class that already has exercises is left alone (so edits made by an admin are
 * never overwritten). A definition with an `id` fills that existing class if it is still empty
 * (the seeded 12-block example): its title, notes, level and length are set and exercises are
 * added to its blocks, matched by label.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildExamples, type ExampleFile, type PlannedClass } from './build-examples.ts'
import { connect, fail, IGNORE_DUPLICATES } from './rest.ts'

const DEFAULT_FILES = [
  'supabase/seed/example-classes.sample.json',
  'supabase/seed/example-classes.json',
]
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const paths = (files.length > 0 ? files : DEFAULT_FILES).map((f) => resolve(f))

const { rest } = connect()

const [methods, blocks, equipment, exercises] = await Promise.all([
  rest<{ id: string }[]>('methods?key=eq.block&select=id'),
  rest<{ id: string; key: string }[]>('blocks?owner_id=is.null&select=id,key'),
  rest<{ id: string; key: string }[]>('equipment?owner_id=is.null&select=id,key'),
  rest<{ id: string }[]>('exercises?owner_id=is.null&select=id&limit=5000'),
])
const method = methods[0]
if (!method) fail('The "block" method is missing. Apply the migrations first.')

const defs = paths.flatMap((p) => (JSON.parse(readFileSync(p, 'utf8')) as ExampleFile).classes)
let planned: PlannedClass[]
try {
  planned = buildExamples(
    { classes: defs },
    {
      methodId: method.id,
      blocksByKey: new Map(blocks.map((b) => [b.key, b.id])),
      equipmentByKey: new Map(equipment.map((e) => [e.key, e.id])),
      exerciseIds: new Set(exercises.map((e) => e.id)),
    },
  )
} catch (e) {
  fail(e instanceof Error ? e.message : String(e))
}

type ExistingClass = {
  id: string
  lesson_slots: { id: string; label: string; position: number; lesson_items: { id: string }[] }[]
}

for (const c of planned) {
  const found = await rest<ExistingClass[]>(
    `lessons?id=eq.${c.id}&select=id,lesson_slots(id,label,position,lesson_items(id))`,
  )
  const existing = found[0]
  const hasItems = existing?.lesson_slots.some((s) => s.lesson_items.length > 0) ?? false
  if (hasItems) {
    console.log(`Skipped "${c.lesson.title}": it already has exercises.`)
    continue
  }

  if (existing) {
    // Fill the empty class in place: set its details, then add exercises to blocks by label.
    await rest(`lessons?id=eq.${c.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        title: c.lesson.title,
        notes: c.lesson.notes,
        level: c.lesson.level,
        target_duration_min: c.lesson.target_duration_min,
        status: 'ready',
      }),
    })
    const byLabel = new Map(existing.lesson_slots.map((s) => [s.label, s.id]))
    const missing = c.slots.filter((s) => !byLabel.has(s.label)).map((s) => s.label)
    if (missing.length > 0) {
      fail(`"${c.lesson.title}" has no block(s) labelled: ${missing.join(', ')}`)
    }
    const items = c.slots.flatMap((s) =>
      s.items.map((i) => ({ ...i, lesson_slot_id: byLabel.get(s.label)! })),
    )
    await rest('lesson_items?on_conflict=id', {
      method: 'POST',
      headers: IGNORE_DUPLICATES,
      body: JSON.stringify(items),
    })
    await insertEquipment(c)
    console.log(`Filled "${c.lesson.title}" with ${items.length} exercises.`)
    continue
  }

  await rest('lessons?on_conflict=id', {
    method: 'POST',
    headers: IGNORE_DUPLICATES,
    body: JSON.stringify([c.lesson]),
  })
  await rest('lesson_slots?on_conflict=id', {
    method: 'POST',
    headers: IGNORE_DUPLICATES,
    body: JSON.stringify(c.slots.map((s) => s.row)),
  })
  const items = c.slots.flatMap((s) => s.items)
  await rest('lesson_items?on_conflict=id', {
    method: 'POST',
    headers: IGNORE_DUPLICATES,
    body: JSON.stringify(items),
  })
  await insertEquipment(c)
  console.log(`Created "${c.lesson.title}": ${c.slots.length} blocks, ${items.length} exercises.`)
}

async function insertEquipment(c: PlannedClass) {
  if (c.equipmentIds.length === 0) return
  await rest('lesson_equipment?on_conflict=lesson_id,equipment_id', {
    method: 'POST',
    headers: IGNORE_DUPLICATES,
    body: JSON.stringify(c.equipmentIds.map((equipment_id) => ({ lesson_id: c.id, equipment_id }))),
  })
}
