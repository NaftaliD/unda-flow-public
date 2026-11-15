import { useQuery } from '@tanstack/react-query'
import type { Level } from '@/domain/library'
import { supabase } from '../supabaseClient'

export type LessonStatus = 'draft' | 'ready' | 'taught'

export type LessonItem = {
  id: string
  slotId: string
  exerciseId: string
  position: number
  reps: number | null
  durationSec: number | null
  springs: string | null
  notes: string | null
}

export type LessonSlot = {
  id: string
  blockId: string
  position: number
  label: string
  isSkipped: boolean
  notes: string | null
  hint: string | null
  isOptional: boolean
  minExercises: number | null
  items: LessonItem[]
}

export type LessonSummary = {
  id: string
  title: string
  lessonDate: string
  level: Level
  status: LessonStatus
  targetDurationMin: number | null
  updatedAt: string
}

export type Lesson = LessonSummary & {
  methodId: string
  notes: string | null
  equipmentIds: string[]
  slots: LessonSlot[]
}

export const lessonKeys = {
  all: ['lessons'] as const,
  list: ['lessons', 'list'] as const,
  detail: (id: string) => ['lessons', 'detail', id] as const,
}

export function useLessons() {
  return useQuery({
    queryKey: lessonKeys.list,
    queryFn: async (): Promise<LessonSummary[]> => {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, lesson_date, level, status, target_duration_min, updated_at')
        .order('lesson_date', { ascending: false })
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data.map((l) => ({
        id: l.id,
        title: l.title,
        lessonDate: l.lesson_date,
        level: l.level as Level,
        status: l.status,
        targetDurationMin: l.target_duration_min,
        updatedAt: l.updated_at,
      }))
    },
  })
}

export function useLesson(id: string) {
  return useQuery({
    queryKey: lessonKeys.detail(id),
    queryFn: async (): Promise<Lesson | null> => {
      const { data, error } = await supabase
        .from('lessons')
        .select(
          'id, method_id, title, lesson_date, level, target_duration_min, notes, status, updated_at, lesson_equipment(equipment_id), lesson_slots(id, block_id, position, label, is_skipped, notes, hint, is_optional, min_exercises, lesson_items(id, lesson_slot_id, exercise_id, position, reps, duration_sec, springs, notes))',
        )
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return {
        id: data.id,
        methodId: data.method_id,
        title: data.title,
        lessonDate: data.lesson_date,
        level: data.level as Level,
        status: data.status,
        targetDurationMin: data.target_duration_min,
        notes: data.notes,
        updatedAt: data.updated_at,
        equipmentIds: data.lesson_equipment.map((e) => e.equipment_id),
        slots: data.lesson_slots
          .map((s) => ({
            id: s.id,
            blockId: s.block_id,
            position: s.position,
            label: s.label,
            isSkipped: s.is_skipped,
            notes: s.notes,
            hint: s.hint,
            isOptional: s.is_optional,
            minExercises: s.min_exercises,
            items: s.lesson_items
              .map((i) => ({
                id: i.id,
                slotId: i.lesson_slot_id,
                exerciseId: i.exercise_id,
                position: i.position,
                reps: i.reps,
                durationSec: i.duration_sec,
                springs: i.springs,
                notes: i.notes,
              }))
              .sort((a, b) => a.position - b.position),
          }))
          .sort((a, b) => a.position - b.position),
      }
    },
  })
}
