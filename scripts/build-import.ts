import { createHash } from 'node:crypto'
import { parseEquipmentSpec } from '../src/domain/equipment.ts'
import { parseCsvObjects } from './csv.ts'

export type ImportExercise = {
  id: string
  owner_id: null
  method_id: string
  block_id: string
  name: string
  level: string
  description: string | null
  cues: string | null
  review_status: 'needs_review'
}
export type ImportSeries = { id: string; owner_id: null; block_id: string; name: string }
export type ImportSeriesItem = { series_id: string; exercise_id: string; position: number }
export type ImportRequirement = { exercise_id: string; equipment_id: string; alt_group: number }

const LEVELS = new Set(['fundamental', 'intermediate', 'advanced'])
// Fixed namespace so the same (name, equipment) row always gets the same id.
const NAMESPACE = 'a3b1c6e0-5d2f-4c1e-9a77-0f4d5e2b8c10'

/** RFC 4122 version 5 UUID. */
export function uuidV5(name: string, namespace: string = NAMESPACE): string {
  const ns = Buffer.from(namespace.replaceAll('-', ''), 'hex')
  const hash = createHash('sha1').update(ns).update(name).digest()
  hash[6] = ((hash[6] ?? 0) & 0x0f) | 0x50
  hash[8] = ((hash[8] ?? 0) & 0x3f) | 0x80
  const hex = hash.subarray(0, 16).toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** The id an imported exercise gets: the same name and equipment spec always give the same id. */
export function exerciseId(name: string, spec: string): string {
  return uuidV5(`${name.trim()}|${spec.trim()}`)
}

export type Lookups = {
  methodId: string
  blocksByKey: ReadonlyMap<string, string>
  equipmentByKey: ReadonlyMap<string, string>
}

/** Validates every row before anything is written; throws one error listing all problems. */
export function buildImport(csvText: string, lookups: Lookups) {
  const rows = parseCsvObjects(csvText)
  const errors: string[] = []
  const exercises: ImportExercise[] = []
  const requirements: ImportRequirement[] = []
  const seen = new Set<string>()
  const seriesByName = new Map<string, { blockId: string; exerciseIds: string[] }>()

  rows.forEach((row, i) => {
    const line = i + 2
    const name = (row.name ?? '').trim()
    const blockKey = (row.block_key ?? '').trim()
    const level = (row.level ?? '').trim()
    const spec = (row.equipment ?? '').trim()
    const seriesName = (row.series ?? '').trim()

    if (!name) errors.push(`line ${line}: empty name`)
    const blockId = lookups.blocksByKey.get(blockKey)
    if (!blockId) errors.push(`line ${line}: unknown block "${blockKey}"`)
    if (!LEVELS.has(level)) errors.push(`line ${line}: unknown level "${level}"`)

    const parsed = parseEquipmentSpec(spec)
    for (const r of parsed) {
      if (!lookups.equipmentByKey.has(r.equipmentKey)) {
        errors.push(`line ${line}: unknown equipment "${r.equipmentKey}"`)
      }
    }

    const id = exerciseId(name, spec)
    if (seen.has(id)) errors.push(`line ${line}: duplicate "${name}" with equipment "${spec}"`)
    seen.add(id)

    if (!name || !blockId || !LEVELS.has(level)) return
    if (seriesName) {
      const entry = seriesByName.get(seriesName) ?? { blockId, exerciseIds: [] }
      if (entry.blockId !== blockId) {
        errors.push(`line ${line}: series "${seriesName}" mixes blocks`)
      }
      entry.exerciseIds.push(id)
      seriesByName.set(seriesName, entry)
    }
    exercises.push({
      id,
      owner_id: null,
      method_id: lookups.methodId,
      block_id: blockId,
      name,
      level,
      description: (row.description ?? '').trim() || null,
      cues: (row.cues ?? '').trim() || null,
      review_status: 'needs_review',
    })
    for (const r of parsed) {
      const equipmentId = lookups.equipmentByKey.get(r.equipmentKey)
      if (equipmentId) {
        requirements.push({ exercise_id: id, equipment_id: equipmentId, alt_group: r.altGroup })
      }
    }
  })

  if (errors.length > 0) throw new Error(`CSV validation failed:\n${errors.join('\n')}`)

  const series: ImportSeries[] = []
  const seriesItems: ImportSeriesItem[] = []
  for (const [name, { blockId, exerciseIds }] of seriesByName) {
    const id = uuidV5(`series|${name}`)
    series.push({ id, owner_id: null, block_id: blockId, name })
    exerciseIds.forEach((exercise_id, position) =>
      seriesItems.push({ series_id: id, exercise_id, position }),
    )
  }
  return { exercises, requirements, series, seriesItems }
}
