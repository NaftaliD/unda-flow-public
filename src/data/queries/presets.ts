import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

export type Preset = { id: string; name: string; equipmentIds: string[] }

export const presetKeys = { all: ['presets'] as const }

/** The caller's equipment presets (they are private to the owner). */
export function usePresets() {
  return useQuery({
    queryKey: presetKeys.all,
    queryFn: async (): Promise<Preset[]> => {
      const { data, error } = await supabase
        .from('equipment_presets')
        .select('id, name, equipment_preset_items(equipment_id)')
        .order('name')
      if (error) throw error
      return data.map((p) => ({
        id: p.id,
        name: p.name,
        equipmentIds: p.equipment_preset_items.map((i) => i.equipment_id),
      }))
    },
  })
}
