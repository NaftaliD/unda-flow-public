import { useMutation, useQueryClient } from '@tanstack/react-query'
import i18n from 'i18next'
import { toast } from 'sonner'
import { lessonKeys } from '../queries/lessons'
import { seriesKeys, type Series } from '../queries/series'
import { supabase } from '../supabaseClient'

export type SaveSeriesInput = {
  id?: string
  /** New series only: an admin can publish to the shared library. */
  shared?: boolean
  blockId: string
  name: string
  exerciseIds: string[]
}

export function useSaveSeries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveSeriesInput): Promise<string> => {
      const { data, error } = await supabase.rpc('save_series', {
        payload: {
          id: input.id ?? null,
          shared: input.shared ?? false,
          block_id: input.blockId,
          name: input.name,
          exercise_ids: input.exerciseIds,
        },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: seriesKeys.all }),
  })
}

/** Copies any visible series (e.g. a shared one) as a private series. */
export function useDuplicateSeries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (s: Series): Promise<string> => {
      const { data, error } = await supabase.rpc('save_series', {
        payload: {
          shared: false,
          block_id: s.blockId,
          name: `${s.name} (copy)`,
          exercise_ids: s.exerciseIds,
        },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: seriesKeys.all }),
  })
}

export function useDeleteSeries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('series').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: seriesKeys.all }),
  })
}

/**
 * Appends a whole series to a lesson block in one call. Runs in the lesson's edit queue so it
 * never overtakes an earlier change, then refetches the lesson (the server picks the positions).
 */
export function useAddSeriesToSlot(lessonId: string) {
  const qc = useQueryClient()
  return useMutation({
    scope: { id: `lesson-${lessonId}` },
    mutationFn: async ({ slotId, seriesId }: { slotId: string; seriesId: string }) => {
      const { data, error } = await supabase.rpc('add_series_to_slot', {
        p_slot_id: slotId,
        p_series_id: seriesId,
      })
      if (error) throw error
      return data
    },
    onSuccess: (count) => toast.success(i18n.t('series.added', { count })),
    onError: () => toast.error(i18n.t('lessons.saveFailed')),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: lessonKeys.detail(lessonId) })
      void qc.invalidateQueries({ queryKey: lessonKeys.list })
    },
  })
}
