import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ExerciseFormValues } from '@/domain/schemas'
import { libraryKeys } from '../queries/library'
import { supabase } from '../supabaseClient'

export type SaveExerciseInput = ExerciseFormValues & {
  id?: string
  reviewStatus?: 'needs_review' | 'verified'
}

function useInvalidateExercises() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: libraryKeys.exercises })
}

/** Creates (no id; always private) or updates an exercise and replaces its equipment, atomically. */
export function useSaveExercise() {
  const invalidate = useInvalidateExercises()
  return useMutation({
    mutationFn: async (input: SaveExerciseInput): Promise<string> => {
      const { data, error } = await supabase.rpc('save_exercise', {
        payload: {
          id: input.id ?? null,
          block_id: input.blockId,
          name: input.name,
          level: input.level,
          description: input.description ?? '',
          cues: input.cues ?? '',
          default_reps: input.defaultReps ?? null,
          default_duration_sec: input.defaultDurationSec ?? null,
          default_springs: input.defaultSprings ?? '',
          review_status: input.reviewStatus ?? null,
          groups: input.groups,
        },
      })
      if (error) throw error
      return data
    },
    onSuccess: invalidate,
  })
}

export function useSetReviewStatus() {
  const invalidate = useInvalidateExercises()
  return useMutation({
    mutationFn: async (vars: { id: string; status: 'needs_review' | 'verified' }) => {
      const { error } = await supabase
        .from('exercises')
        .update({ review_status: vars.status })
        .eq('id', vars.id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useSetArchived() {
  const invalidate = useInvalidateExercises()
  return useMutation({
    mutationFn: async (vars: { id: string; archived: boolean }) => {
      const { error } = await supabase
        .from('exercises')
        .update({ is_archived: vars.archived })
        .eq('id', vars.id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useDeleteExercise() {
  const invalidate = useInvalidateExercises()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercises').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
