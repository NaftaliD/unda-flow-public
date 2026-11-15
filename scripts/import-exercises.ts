/**
 * Imports an exercise CSV as shared exercises (needs_review). Defaults to the small sample file
 * supabase/seed/exercises.sample.csv; the real list lives outside git (supabase/seed/private/).
 * Run locally with the SECRET key; it never belongs in the client, CI secrets or Cloudflare.
 *
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=sb_secret_... npm run db:import
 *   npm run db:import -- supabase/seed/private/exercises.block.csv     (or EXERCISE_CSV=path)
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

const force = process.argv.includes('--force')
const seriesOnly = process.argv.includes('--series-only')
const csvArg = process.argv.slice(2).find((a) => !a.startsWith('--'))
const csvPath = resolve(csvArg ?? process.env.EXERCISE_CSV ?? 'supabase/seed/exercises.sample.csv')
const baseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
const secretKey = process.env.SUPABASE_SECRET_KEY ?? ''

if (!baseUrl) fail('SUPABASE_URL is not set.')
if (!secretKey.startsWith('sb_secret_')) fail('SUPABASE_SECRET_KEY must be a sb_secret_... key.')

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: secretKey,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok)
    throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${await res.text()}`)
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

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

const csv = readFileSync(csvPath, 'utf8')
const { exercises, requirements, series, seriesItems } = buildImport(csv, {
  methodId: method.id,
  blocksByKey: new Map(blocks.map((b) => [b.key, b.id])),
  equipmentByKey: new Map(equipment.map((e) => [e.key, e.id])),
})

const ignore = { Prefer: 'resolution=ignore-duplicates,return=minimal' }
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
