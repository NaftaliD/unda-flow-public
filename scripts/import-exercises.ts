/**
 * Imports supabase/seed/exercises.block.csv as shared exercises (needs_review).
 * Run locally with the SECRET key; it never belongs in the client, CI secrets or Cloudflare.
 *
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=sb_secret_... npm run db:import
 *
 * Insert-only: refuses to run when shared exercises already exist (so admin corrections are
 * never overwritten and deleted rows are not resurrected), unless --force, which skips
 * rows whose deterministic id already exists.
 */
import { readFileSync } from 'node:fs'
import { buildImport } from './build-import.ts'

const force = process.argv.includes('--force')
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
if (existing.length > 0 && !force) {
  fail('Shared exercises already exist. Nothing imported. Use --force to add only missing rows.')
}

const csv = readFileSync(new URL('../supabase/seed/exercises.block.csv', import.meta.url), 'utf8')
const { exercises, requirements } = buildImport(csv, {
  methodId: method.id,
  blocksByKey: new Map(blocks.map((b) => [b.key, b.id])),
  equipmentByKey: new Map(equipment.map((e) => [e.key, e.id])),
})

const ignore = { Prefer: 'resolution=ignore-duplicates,return=minimal' }
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
