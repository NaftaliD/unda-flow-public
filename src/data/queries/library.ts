import { useQuery } from '@tanstack/react-query'
import type { Level, LibraryExercise } from '@/domain/library'
import { supabase } from '../supabaseClient'

export type Block = {
  id: string
  /** null = shared library block. */
  ownerId: string | null
  methodId: string
  key: string
  name: string
  goal: string | null
  position: number
  /** Placeholder time per exercise in this block, in seconds. */
  defaultDurationSec: number
}
export type Equipment = { id: string; key: string; name: string; kind: 'apparatus' | 'prop' }
export type Exercise = LibraryExercise & {
  description: string | null
  cues: string | null
  defaultReps: number | null
  defaultDurationSec: number
  defaultSprings: string | null
}

export const libraryKeys = {
  blocks: ['blocks'] as const,
  equipment: ['equipment'] as const,
  exercises: ['exercises'] as const,
}

export function useBlocks() {
  return useQuery({
    queryKey: libraryKeys.blocks,
    staleTime: Infinity,
    queryFn: async (): Promise<Block[]> => {
      const { data, error } = await supabase
        .from('blocks')
        .select('id, owner_id, method_id, key, name, goal, default_position, default_duration_sec')
        .order('default_position')
        .order('name')
      if (error) throw error
      return data.map((b) => ({
        id: b.id,
        ownerId: b.owner_id,
        methodId: b.method_id,
        key: b.key,
        name: b.name,
        goal: b.goal,
        position: b.default_position,
        defaultDurationSec: b.default_duration_sec,
      }))
    },
  })
}

export function useEquipment() {
  return useQuery({
    queryKey: libraryKeys.equipment,
    staleTime: Infinity,
    queryFn: async (): Promise<Equipment[]> => {
      const { data, error } = await supabase
        .from('equipment')
        .select('id, key, name, kind')
        .order('kind')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

/** Every exercise visible to the caller (shared + own), with its equipment requirements. */
export function useExercises() {
  return useQuery({
    queryKey: libraryKeys.exercises,
    queryFn: async (): Promise<Exercise[]> => {
      const { data, error } = await supabase
        .from('exercises')
        .select(
          'id, owner_id, block_id, name, description, cues, level, default_reps, default_duration_sec, default_springs, review_status, is_archived, exercise_equipment(equipment_id, alt_group, is_optional)',
        )
        .order('name')
      if (error) throw error
      return data.map((e) => ({
        id: e.id,
        name: e.name,
        ownerId: e.owner_id,
        blockId: e.block_id,
        level: e.level as Level,
        isArchived: e.is_archived,
        reviewStatus: e.review_status,
        description: e.description,
        cues: e.cues,
        defaultReps: e.default_reps,
        defaultDurationSec: e.default_duration_sec,
        defaultSprings: e.default_springs,
        requirements: e.exercise_equipment.map((r) => ({
          equipmentId: r.equipment_id,
          altGroup: r.alt_group,
          optional: r.is_optional,
        })),
      }))
    },
  })
}
