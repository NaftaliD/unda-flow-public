import type { Exercise } from '@/data/queries/library'
import { optionalEquipmentIds, requirementsToGroups } from '@/domain/equipment'
import type { ExerciseFormInput } from '@/domain/schemas'

export function toFormValues(e: Exercise, nameOverride?: string): ExerciseFormInput {
  return {
    name: nameOverride ?? e.name,
    blockId: e.blockId,
    level: e.level,
    description: e.description ?? '',
    cues: e.cues ?? '',
    defaultReps: e.defaultReps ?? '',
    defaultDurationSec: e.defaultDurationSec ?? '',
    defaultSprings: e.defaultSprings ?? '',
    groups: requirementsToGroups(e.requirements),
    optionalIds: optionalEquipmentIds(e.requirements),
  }
}
