import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TemplateFormValues } from '@/domain/schemas'
import { lessonKeys } from '../queries/lessons'
import { templateKeys, type Template } from '../queries/templates'
import { supabase } from '../supabaseClient'

export type SaveTemplateInput = TemplateFormValues & {
  id?: string
  methodId: string
  /** New templates only: an admin can publish to the shared library. */
  shared?: boolean
}

function toPayload(input: SaveTemplateInput) {
  return {
    id: input.id ?? null,
    shared: input.shared ?? false,
    method_id: input.methodId,
    name: input.name,
    description: input.description,
    target_duration_min: input.targetDurationMin ?? null,
    slots: input.slots.map((s) => ({
      block_id: s.blockId,
      label: s.label,
      is_optional: s.isOptional,
      min_exercises: s.minExercises ?? null,
      hint: s.hint,
    })),
  }
}

function useInvalidateTemplates() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: templateKeys.all })
}

export function useSaveTemplate() {
  const invalidate = useInvalidateTemplates()
  return useMutation({
    mutationFn: async (input: SaveTemplateInput): Promise<string> => {
      const { data, error } = await supabase.rpc('save_template', { payload: toPayload(input) })
      if (error) throw error
      return data
    },
    onSuccess: invalidate,
  })
}

/** Copies any visible template (e.g. a shared one) as a private template. */
export function useDuplicateTemplate() {
  const invalidate = useInvalidateTemplates()
  return useMutation({
    mutationFn: async (t: Template): Promise<string> => {
      const { data, error } = await supabase.rpc('save_template', {
        payload: {
          shared: false,
          method_id: t.methodId,
          name: `${t.name} (copy)`,
          description: t.description ?? '',
          target_duration_min: t.targetDurationMin,
          slots: t.slots.map((s) => ({
            block_id: s.blockId,
            label: s.label,
            is_optional: s.isOptional,
            min_exercises: s.minExercises,
            hint: s.hint ?? '',
          })),
        },
      })
      if (error) throw error
      return data
    },
    onSuccess: invalidate,
  })
}

export function useDeleteTemplate() {
  const invalidate = useInvalidateTemplates()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: lessonKeys.all })
      return invalidate()
    },
  })
}

export function useSaveLessonAsTemplate() {
  const invalidate = useInvalidateTemplates()
  return useMutation({
    mutationFn: async ({ lessonId, name }: { lessonId: string; name: string }): Promise<string> => {
      const { data, error } = await supabase.rpc('save_lesson_as_template', {
        p_lesson_id: lessonId,
        p_name: name,
      })
      if (error) throw error
      return data
    },
    onSuccess: invalidate,
  })
}
