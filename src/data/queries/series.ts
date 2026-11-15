import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

export type Series = {
  id: string
  /** null = shared library series. */
  ownerId: string | null
  blockId: string
  name: string
  /** Exercise ids in series order. */
  exerciseIds: string[]
}

export const seriesKeys = { all: ['series'] as const }

/** Every series visible to the caller (shared + own), each with its ordered exercise ids. */
export function useSeries() {
  return useQuery({
    queryKey: seriesKeys.all,
    queryFn: async (): Promise<Series[]> => {
      const { data, error } = await supabase
        .from('series')
        .select('id, owner_id, block_id, name, series_items(exercise_id, position)')
        .order('name')
      if (error) throw error
      return data.map((s) => ({
        id: s.id,
        ownerId: s.owner_id,
        blockId: s.block_id,
        name: s.name,
        exerciseIds: s.series_items
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((i) => i.exercise_id),
      }))
    },
  })
}
