import { useMutation, useQueryClient } from '@tanstack/react-query'
import i18n from 'i18next'
import { toast } from 'sonner'
import type { LessonFormValues } from '@/domain/schemas'
import {
  lessonKeys,
  type Lesson,
  type LessonItem,
  type LessonSlot,
  type LessonStatus,
} from '../queries/lessons'
import { supabase } from '../supabaseClient'

export type NewLessonInput = LessonFormValues & {
  methodId: string
  slots: { blockId: string; label: string }[]
}

export function useCreateLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewLessonInput): Promise<string> => {
      const { data, error } = await supabase.rpc('create_lesson', {
        payload: {
          method_id: input.methodId,
          title: input.title,
          lesson_date: input.lessonDate,
          level: input.level,
          target_duration_min: input.targetDurationMin ?? null,
          equipment_ids: input.equipmentIds,
          slots: input.slots.map((s) => ({ block_id: s.blockId, label: s.label })),
        },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: lessonKeys.all }),
  })
}

export function useDuplicateLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const { data, error } = await supabase.rpc('duplicate_lesson', { p_id: id })
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: lessonKeys.all }),
  })
}

export function useDeleteLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lessons').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: lessonKeys.all }),
  })
}

/**
 * Builder edits are optimistic: patch the cached lesson immediately, roll back with a toast
 * if the write fails, and refetch when settled.
 */
function useLessonEdit<V>(
  lessonId: string,
  run: (vars: V) => Promise<void>,
  patch: (lesson: Lesson, vars: V) => Lesson,
) {
  const qc = useQueryClient()
  const key = lessonKeys.detail(lessonId)
  return useMutation({
    mutationFn: run,
    onMutate: async (vars: V) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Lesson | null>(key)
      if (previous) qc.setQueryData<Lesson | null>(key, patch(previous, vars))
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous)
      toast.error(i18n.t('lessons.saveFailed'))
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key })
      void qc.invalidateQueries({ queryKey: lessonKeys.list })
    },
  })
}

export type LessonPatch = Partial<{
  title: string
  lessonDate: string
  level: Lesson['level']
  targetDurationMin: number | null
  status: LessonStatus
  notes: string | null
}>

export function useUpdateLesson(lessonId: string) {
  return useLessonEdit<LessonPatch>(
    lessonId,
    async (p) => {
      const { error } = await supabase
        .from('lessons')
        .update({
          ...(p.title !== undefined && { title: p.title }),
          ...(p.lessonDate !== undefined && { lesson_date: p.lessonDate }),
          ...(p.level !== undefined && { level: p.level }),
          ...(p.targetDurationMin !== undefined && { target_duration_min: p.targetDurationMin }),
          ...(p.status !== undefined && { status: p.status }),
          ...(p.notes !== undefined && { notes: p.notes }),
        })
        .eq('id', lessonId)
      if (error) throw error
    },
    (l, p) => ({ ...l, ...p }),
  )
}

/** Replace the lesson's available equipment (delete removed, insert added). */
export function useSetLessonEquipment(lessonId: string) {
  return useLessonEdit<string[]>(
    lessonId,
    async (ids) => {
      const { data, error } = await supabase
        .from('lesson_equipment')
        .select('equipment_id')
        .eq('lesson_id', lessonId)
      if (error) throw error
      const current = new Set(data.map((r) => r.equipment_id))
      const next = new Set(ids)
      const toRemove = [...current].filter((id) => !next.has(id))
      const toAdd = [...next].filter((id) => !current.has(id))
      if (toRemove.length) {
        const { error: e } = await supabase
          .from('lesson_equipment')
          .delete()
          .eq('lesson_id', lessonId)
          .in('equipment_id', toRemove)
        if (e) throw e
      }
      if (toAdd.length) {
        const { error: e } = await supabase
          .from('lesson_equipment')
          .insert(toAdd.map((equipment_id) => ({ lesson_id: lessonId, equipment_id })))
        if (e) throw e
      }
    },
    (l, ids) => ({ ...l, equipmentIds: ids }),
  )
}

export type SlotPatch = { slotId: string } & Partial<{
  label: string
  isSkipped: boolean
  notes: string | null
}>

export function useUpdateSlot(lessonId: string) {
  return useLessonEdit<SlotPatch>(
    lessonId,
    async ({ slotId, ...p }) => {
      const { error } = await supabase
        .from('lesson_slots')
        .update({
          ...(p.label !== undefined && { label: p.label }),
          ...(p.isSkipped !== undefined && { is_skipped: p.isSkipped }),
          ...(p.notes !== undefined && { notes: p.notes }),
        })
        .eq('id', slotId)
      if (error) throw error
    },
    (l, { slotId, ...p }) => ({
      ...l,
      slots: l.slots.map((s) => (s.id === slotId ? { ...s, ...p } : s)),
    }),
  )
}

/** New slot order, as ids. */
export function useReorderSlots(lessonId: string) {
  return useLessonEdit<string[]>(
    lessonId,
    async (ids) => {
      const { error } = await supabase.rpc('reorder', { p_kind: 'slots', p_ids: ids })
      if (error) throw error
    },
    (l, ids) => ({
      ...l,
      slots: ids
        .map((id, position) => {
          const s = l.slots.find((x) => x.id === id)
          return s ? { ...s, position } : undefined
        })
        .filter((s): s is LessonSlot => s !== undefined),
    }),
  )
}

/** New item order within one slot, as ids. */
export function useReorderItems(lessonId: string) {
  return useLessonEdit<{ slotId: string; ids: string[] }>(
    lessonId,
    async ({ ids }) => {
      const { error } = await supabase.rpc('reorder', { p_kind: 'items', p_ids: ids })
      if (error) throw error
    },
    (l, { slotId, ids }) => ({
      ...l,
      slots: l.slots.map((s) =>
        s.id !== slotId
          ? s
          : {
              ...s,
              items: ids
                .map((id, position) => {
                  const i = s.items.find((x) => x.id === id)
                  return i ? { ...i, position } : undefined
                })
                .filter((i): i is LessonItem => i !== undefined),
            },
      ),
    }),
  )
}

export type NewItem = {
  slotId: string
  exerciseId: string
  reps: number | null
  durationSec: number | null
  springs: string | null
}

/** Adds an exercise at the end of a slot, copying the exercise's defaults. */
export function useAddItem(lessonId: string) {
  return useLessonEdit<NewItem>(
    lessonId,
    async (n) => {
      const { data, error } = await supabase
        .from('lesson_items')
        .select('position')
        .eq('lesson_slot_id', n.slotId)
        .order('position', { ascending: false })
        .limit(1)
      if (error) throw error
      const position = (data[0]?.position ?? -1) + 1
      const { error: e } = await supabase.from('lesson_items').insert({
        lesson_slot_id: n.slotId,
        exercise_id: n.exerciseId,
        position,
        reps: n.reps,
        duration_sec: n.durationSec,
        springs: n.springs,
      })
      if (e) throw e
    },
    (l, n) => ({
      ...l,
      slots: l.slots.map((s) =>
        s.id !== n.slotId
          ? s
          : {
              ...s,
              items: [
                ...s.items,
                {
                  id: `pending-${crypto.randomUUID()}`,
                  slotId: n.slotId,
                  exerciseId: n.exerciseId,
                  position: s.items.length,
                  reps: n.reps,
                  durationSec: n.durationSec,
                  springs: n.springs,
                  notes: null,
                },
              ],
            },
      ),
    }),
  )
}

export type ItemPatch = { itemId: string } & Partial<{
  reps: number | null
  durationSec: number | null
  springs: string | null
  notes: string | null
}>

export function useUpdateItem(lessonId: string) {
  return useLessonEdit<ItemPatch>(
    lessonId,
    async ({ itemId, ...p }) => {
      const { error } = await supabase
        .from('lesson_items')
        .update({
          ...(p.reps !== undefined && { reps: p.reps }),
          ...(p.durationSec !== undefined && { duration_sec: p.durationSec }),
          ...(p.springs !== undefined && { springs: p.springs }),
          ...(p.notes !== undefined && { notes: p.notes }),
        })
        .eq('id', itemId)
      if (error) throw error
    },
    (l, { itemId, ...p }) => ({
      ...l,
      slots: l.slots.map((s) => ({
        ...s,
        items: s.items.map((i) => (i.id === itemId ? { ...i, ...p } : i)),
      })),
    }),
  )
}

/** Moves an item to the end of another slot. */
export function useMoveItem(lessonId: string) {
  return useLessonEdit<{ itemId: string; toSlotId: string }>(
    lessonId,
    async ({ itemId, toSlotId }) => {
      const { data, error } = await supabase
        .from('lesson_items')
        .select('position')
        .eq('lesson_slot_id', toSlotId)
        .order('position', { ascending: false })
        .limit(1)
      if (error) throw error
      const { error: e } = await supabase
        .from('lesson_items')
        .update({ lesson_slot_id: toSlotId, position: (data[0]?.position ?? -1) + 1 })
        .eq('id', itemId)
      if (e) throw e
    },
    (l, { itemId, toSlotId }) => {
      const item = l.slots.flatMap((s) => s.items).find((i) => i.id === itemId)
      if (!item) return l
      return {
        ...l,
        slots: l.slots.map((s) => {
          const without = s.items.filter((i) => i.id !== itemId)
          return s.id === toSlotId
            ? { ...s, items: [...without, { ...item, slotId: toSlotId, position: without.length }] }
            : { ...s, items: without }
        }),
      }
    },
  )
}

export function useDeleteItem(lessonId: string) {
  return useLessonEdit<string>(
    lessonId,
    async (itemId) => {
      const { error } = await supabase.from('lesson_items').delete().eq('id', itemId)
      if (error) throw error
    },
    (l, itemId) => ({
      ...l,
      slots: l.slots.map((s) => ({ ...s, items: s.items.filter((i) => i.id !== itemId) })),
    }),
  )
}
