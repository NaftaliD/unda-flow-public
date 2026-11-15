import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

export type TemplateSlot = {
  id: string
  blockId: string
  position: number
  label: string
  isOptional: boolean
  minExercises: number | null
  hint: string | null
}

export type Template = {
  id: string
  /** null = shared library template. */
  ownerId: string | null
  methodId: string
  name: string
  description: string | null
  targetDurationMin: number | null
  slots: TemplateSlot[]
}

export const templateKeys = { all: ['templates'] as const }

/** Every template visible to the caller (shared + own), each with its ordered slots. */
export function useTemplates() {
  return useQuery({
    queryKey: templateKeys.all,
    queryFn: async (): Promise<Template[]> => {
      const { data, error } = await supabase
        .from('templates')
        .select(
          'id, owner_id, method_id, name, description, target_duration_min, template_slots(id, block_id, position, label, is_optional, min_exercises, hint)',
        )
        .order('name')
      if (error) throw error
      return data.map((t) => ({
        id: t.id,
        ownerId: t.owner_id,
        methodId: t.method_id,
        name: t.name,
        description: t.description,
        targetDurationMin: t.target_duration_min,
        slots: t.template_slots
          .map((s) => ({
            id: s.id,
            blockId: s.block_id,
            position: s.position,
            label: s.label,
            isOptional: s.is_optional,
            minExercises: s.min_exercises,
            hint: s.hint,
          }))
          .sort((a, b) => a.position - b.position),
      }))
    },
  })
}
