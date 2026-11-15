import { useMutation, useQueryClient } from '@tanstack/react-query'
import { presetKeys } from '../queries/presets'
import { supabase } from '../supabaseClient'

/** Saves a preset. Without an id, a preset with the same name is replaced. */
export function useSavePreset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { id?: string; name: string; equipmentIds: string[] }) => {
      const { data, error } = await supabase.rpc('save_preset', {
        payload: { id: p.id ?? null, name: p.name, equipment_ids: p.equipmentIds },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: presetKeys.all }),
  })
}

export function useDeletePreset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('equipment_presets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: presetKeys.all }),
  })
}
