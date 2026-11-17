/**
 * Imports exercise CSVs as shared exercises (needs_review). With no argument it imports the small
 * sample file and the example-class exercises (supabase/seed/exercises.sample.csv and
 * example-exercises.csv); the real list lives outside git (supabase/seed/private/). Optional CSV
 * columns `description` and `cues` are imported too.
 * Run locally with the SECRET key; it never belongs in the client, CI secrets or Cloudflare.
 *
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=sb_secret_... npm run db:import
 *   npm run db:import -- supabase/seed/private/exercises.block.csv     (or EXERCISE_CSV=path)
 *   npm run db:import -- supabase/seed/example-exercises.csv --force   (add the example exercises)
 *
 * Insert-only: refuses to run when shared exercises already exist (so admin corrections are
 * never overwritten and deleted rows are not resurrected), unless --force, which skips
 * rows whose deterministic id already exists.
 *
 * Rows sharing a `series` value also become a shared series, in CSV order.
 * --series-only adds just the series to a database that already has the exercises: it skips
 * series that already exist (so admin edits are kept) and exercises that no longer exist.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildImport } from './build-import.ts'
import { connect, fail, IGNORE_DUPLICATES } from './rest.ts'

const force = process.argv.includes('--force')
const seriesOnly = process.argv.includes('--series-only')
const csvArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'))
// No argument: the committed dev/CI files (the sample list and the example-class exercises).
const csvPaths = (
  csvArgs.length > 0
    ? csvArgs
    : process.env.EXERCISE_CSV
      ? [process.env.EXERCISE_CSV]
      : ['supabase/seed/exercises.sample.csv', 'supabase/seed/example-exercises.csv']
).map((p) => resolve(p))

const { rest } = connect()

const [methods, blocks, equipment, existing] = await Promise.all([
  rest<{ id: string }[]>('methods?key=eq.block&select=id'),
  rest<{ id: string; key: string }[]>('blocks?owner_id=is.null&select=id,key'),
  rest<{ id: string; key: string }[]>('equipment?owner_id=is.null&select=id,key'),
  rest<{ id: string }[]>('exercises?owner_id=is.null&select=id&limit=1'),
])

const method = methods[0]
if (!method) fail('The "block" method is missing. Apply the migrations first.')
if (existing.length > 0 && !force && !seriesOnly) {
  fail('Shared exercises already exist. Nothing imported. Use --force to add only missing rows.')
}

const lookups = {
  methodId: method.id,
  blocksByKey: new Map(blocks.map((b) => [b.key, b.id])),
  equipmentByKey: new Map(equipment.map((e) => [e.key, e.id])),
}
const built = csvPaths.map((p) => buildImport(readFileSync(p, 'utf8'), lookups))
const exercises = built.flatMap((b) => b.exercises)
const requirements = built.flatMap((b) => b.requirements)
const series = built.flatMap((b) => b.series)
const seriesItems = built.flatMap((b) => b.seriesItems)

const ignore = IGNORE_DUPLICATES
if (!seriesOnly) {
  await rest('exercises?on_conflict=id', {
    method: 'POST',
    headers: ignore,
    body: JSON.stringify(exercises),
  })
  await rest('exercise_equipment?on_conflict=exercise_id,equipment_id', {
    method: 'POST',
    headers: ignore,
    body: JSON.stringify(requirements),
  })
  console.log(`Imported ${exercises.length} exercises and ${requirements.length} requirements.`)
}

// Series: only ones that do not exist yet (admin edits are never overwritten), and only items
// whose exercise is still there.
const [haveExercises, haveSeries] = await Promise.all([
  rest<{ id: string }[]>('exercises?owner_id=is.null&select=id'),
  rest<{ id: string }[]>('series?owner_id=is.null&select=id'),
])
const exerciseIds = new Set(haveExercises.map((e) => e.id))
const seriesIds = new Set(haveSeries.map((s) => s.id))
const candidateIds = new Set(series.filter((s) => !seriesIds.has(s.id)).map((s) => s.id))
const items = seriesItems.filter(
  (i) => candidateIds.has(i.series_id) && exerciseIds.has(i.exercise_id),
)
const skipped = seriesItems.filter((i) => candidateIds.has(i.series_id)).length - items.length
// A series whose exercises are all missing is not created empty.
const usedIds = new Set(items.map((i) => i.series_id))
const newSeries = series.filter((s) => usedIds.has(s.id))

if (newSeries.length > 0) {
  await rest('series?on_conflict=id', {
    method: 'POST',
    headers: ignore,
    body: JSON.stringify(newSeries),
  })
  await rest('series_items?on_conflict=series_id,exercise_id', {
    method: 'POST',
    headers: ignore,
    body: JSON.stringify(items),
  })
}
console.log(
  `Imported ${newSeries.length} series with ${items.length} exercises` +
    (skipped > 0 ? ` (${skipped} skipped: exercise not found).` : '.'),
)
