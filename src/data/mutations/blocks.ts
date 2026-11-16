import { useMutation, useQueryClient } from '@tanstack/react-query'
import { libraryKeys } from '../queries/library'
import { supabase } from '../supabaseClient'

function useInvalidateBlocks() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: libraryKeys.blocks })
}

/** A private (custom) block. Shared blocks are admin-only and not edited here. */
export function useSaveBlock() {
  const invalidate = useInvalidateBlocks()
  return useMutation({
    mutationFn: async (b: {
      ownerId: string
      methodId: string
      key: string
      name: string
      goal: string
      defaultDurationSec: number
    }) => {
      const { error } = await supabase.from('blocks').insert({
        owner_id: b.ownerId,
        method_id: b.methodId,
        key: b.key,
        name: b.name,
        goal: b.goal || null,
        default_position: 100,
        default_duration_sec: b.defaultDurationSec,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

/** Fails with 23503 when the block is used by an exercise, lesson or template. */
export function useDeleteBlock() {
  const invalidate = useInvalidateBlocks()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blocks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
