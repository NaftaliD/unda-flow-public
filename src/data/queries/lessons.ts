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
  /** null = a shared example class (everyone can read it, admins edit it). */
  ownerId: string | null
  title: string
  /** Optional: a class is a plan, not a calendar entry. */
  lessonDate: string | null
  level: Level
  status: LessonStatus
  targetDurationMin: number | null
  updatedAt: string
  blockCount: number
  exerciseCount: number
}

export type Lesson = LessonSummary & {
  methodId: string
  notes: string | null
  /** The class this one was copied from, if any. */
  sourceLessonId: string | null
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
        .select(
          'id, owner_id, title, lesson_date, level, status, target_duration_min, updated_at, lesson_slots(id, is_skipped, lesson_items(id))',
        )
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data.map((l) => ({
        id: l.id,
        ownerId: l.owner_id,
        title: l.title,
        lessonDate: l.lesson_date,
        level: l.level as Level,
        status: l.status,
        targetDurationMin: l.target_duration_min,
        updatedAt: l.updated_at,
        blockCount: l.lesson_slots.length,
        exerciseCount: l.lesson_slots.reduce((n, s) => n + s.lesson_items.length, 0),
      }))
    },
  })
}

export function useLesson(id: string) {
  return useQuery({
    queryKey: lessonKeys.detail(id),
    // An empty id means "no class" (e.g. a blank new class): never ask the database for it.
    enabled: id !== '',
    queryFn: async (): Promise<Lesson | null> => {
      const { data, error } = await supabase
        .from('lessons')
        .select(
          'id, owner_id, method_id, source_lesson_id, title, lesson_date, level, target_duration_min, notes, status, updated_at, lesson_equipment(equipment_id), lesson_slots(id, block_id, position, label, is_skipped, notes, hint, is_optional, min_exercises, lesson_items(id, lesson_slot_id, exercise_id, position, reps, duration_sec, springs, notes))',
        )
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return {
        id: data.id,
        ownerId: data.owner_id,
        methodId: data.method_id,
        sourceLessonId: data.source_lesson_id,
        blockCount: data.lesson_slots.length,
        exerciseCount: data.lesson_slots.reduce((n, s) => n + s.lesson_items.length, 0),
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
