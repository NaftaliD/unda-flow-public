
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "blocks": {
                  Row: {
                    "default_duration_sec": number,"default_position": number,"goal": string | null,"id": string,"key": string,"method_id": string,"name": string,"owner_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "default_duration_sec"?: number,"default_position"?: number,"goal"?: string | null,"id"?: string,"key": string,"method_id": string,"name": string,"owner_id"?: string | null
                  }
                  Update: {
                    "default_duration_sec"?: number,"default_position"?: number,"goal"?: string | null,"id"?: string,"key"?: string,"method_id"?: string,"name"?: string,"owner_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_method_id_fkey"
      columns: ["method_id"]
isOneToOne: false
      referencedRelation: "methods"
      referencedColumns: ["id"]
    }
                  ]
                },"equipment": {
                  Row: {
                    "id": string,"key": string,"kind": Database["public"]['Enums']["equipment_kind"],"name": string,"owner_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"key": string,"kind": Database["public"]['Enums']["equipment_kind"],"name": string,"owner_id"?: string | null
                  }
                  Update: {
                    "id"?: string,"key"?: string,"kind"?: Database["public"]['Enums']["equipment_kind"],"name"?: string,"owner_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"equipment_preset_items": {
                  Row: {
                    "equipment_id": string,"preset_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "equipment_id": string,"preset_id": string
                  }
                  Update: {
                    "equipment_id"?: string,"preset_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "equipment_preset_items_equipment_id_fkey"
      columns: ["equipment_id"]
isOneToOne: false
      referencedRelation: "equipment"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "equipment_preset_items_preset_id_fkey"
      columns: ["preset_id"]
isOneToOne: false
      referencedRelation: "equipment_presets"
      referencedColumns: ["id"]
    }
                  ]
                },"equipment_presets": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"owner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"owner_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"owner_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"exercise_equipment": {
                  Row: {
                    "alt_group": number,"equipment_id": string,"exercise_id": string,"is_optional": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_group"?: number,"equipment_id": string,"exercise_id": string,"is_optional"?: boolean
                  }
                  Update: {
                    "alt_group"?: number,"equipment_id"?: string,"exercise_id"?: string,"is_optional"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercise_equipment_equipment_id_fkey"
      columns: ["equipment_id"]
isOneToOne: false
      referencedRelation: "equipment"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exercise_equipment_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    }
                  ]
                },"exercises": {
                  Row: {
                    "block_id": string,"created_at": string,"cues": string | null,"default_duration_sec": number,"default_reps": number | null,"default_springs": string | null,"description": string | null,"id": string,"is_archived": boolean,"level": Database["public"]['Enums']["exercise_level"],"media_url": string | null,"method_id": string,"name": string,"owner_id": string | null,"review_status": Database["public"]['Enums']["review_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "block_id": string,"created_at"?: string,"cues"?: string | null,"default_duration_sec": number,"default_reps"?: number | null,"default_springs"?: string | null,"description"?: string | null,"id"?: string,"is_archived"?: boolean,"level"?: Database["public"]['Enums']["exercise_level"],"media_url"?: string | null,"method_id": string,"name": string,"owner_id"?: string | null,"review_status"?: Database["public"]['Enums']["review_status"],"updated_at"?: string
                  }
                  Update: {
                    "block_id"?: string,"created_at"?: string,"cues"?: string | null,"default_duration_sec"?: number,"default_reps"?: number | null,"default_springs"?: string | null,"description"?: string | null,"id"?: string,"is_archived"?: boolean,"level"?: Database["public"]['Enums']["exercise_level"],"media_url"?: string | null,"method_id"?: string,"name"?: string,"owner_id"?: string | null,"review_status"?: Database["public"]['Enums']["review_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercises_block_id_fkey"
      columns: ["block_id"]
isOneToOne: false
      referencedRelation: "blocks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exercises_method_id_fkey"
      columns: ["method_id"]
isOneToOne: false
      referencedRelation: "methods"
      referencedColumns: ["id"]
    }
                  ]
                },"keep_alive": {
                  Row: {
                    "id": number,"pinged_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": number,"pinged_at"?: string
                  }
                  Update: {
                    "id"?: number,"pinged_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"lesson_equipment": {
                  Row: {
                    "equipment_id": string,"lesson_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "equipment_id": string,"lesson_id": string
                  }
                  Update: {
                    "equipment_id"?: string,"lesson_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_equipment_equipment_id_fkey"
      columns: ["equipment_id"]
isOneToOne: false
      referencedRelation: "equipment"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_equipment_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_items": {
                  Row: {
                    "duration_sec": number | null,"exercise_id": string,"id": string,"lesson_slot_id": string,"notes": string | null,"position": number,"reps": number | null,"springs": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "duration_sec"?: number | null,"exercise_id": string,"id"?: string,"lesson_slot_id": string,"notes"?: string | null,"position"?: number,"reps"?: number | null,"springs"?: string | null
                  }
                  Update: {
                    "duration_sec"?: number | null,"exercise_id"?: string,"id"?: string,"lesson_slot_id"?: string,"notes"?: string | null,"position"?: number,"reps"?: number | null,"springs"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_items_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_items_lesson_slot_id_fkey"
      columns: ["lesson_slot_id"]
isOneToOne: false
      referencedRelation: "lesson_slots"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_slots": {
                  Row: {
                    "block_id": string,"hint": string | null,"id": string,"is_optional": boolean,"is_skipped": boolean,"label": string,"lesson_id": string,"min_exercises": number | null,"notes": string | null,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "block_id": string,"hint"?: string | null,"id"?: string,"is_optional"?: boolean,"is_skipped"?: boolean,"label": string,"lesson_id": string,"min_exercises"?: number | null,"notes"?: string | null,"position"?: number
                  }
                  Update: {
                    "block_id"?: string,"hint"?: string | null,"id"?: string,"is_optional"?: boolean,"is_skipped"?: boolean,"label"?: string,"lesson_id"?: string,"min_exercises"?: number | null,"notes"?: string | null,"position"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_slots_block_id_fkey"
      columns: ["block_id"]
isOneToOne: false
      referencedRelation: "blocks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_slots_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"lessons": {
                  Row: {
                    "created_at": string,"id": string,"lesson_date": string | null,"level": Database["public"]['Enums']["exercise_level"],"method_id": string,"notes": string | null,"owner_id": string | null,"source_lesson_id": string | null,"status": Database["public"]['Enums']["lesson_status"],"target_duration_min": number | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"lesson_date"?: string | null,"level"?: Database["public"]['Enums']["exercise_level"],"method_id": string,"notes"?: string | null,"owner_id"?: string | null,"source_lesson_id"?: string | null,"status"?: Database["public"]['Enums']["lesson_status"],"target_duration_min"?: number | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"lesson_date"?: string | null,"level"?: Database["public"]['Enums']["exercise_level"],"method_id"?: string,"notes"?: string | null,"owner_id"?: string | null,"source_lesson_id"?: string | null,"status"?: Database["public"]['Enums']["lesson_status"],"target_duration_min"?: number | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lessons_method_id_fkey"
      columns: ["method_id"]
isOneToOne: false
      referencedRelation: "methods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lessons_source_lesson_id_fkey"
      columns: ["source_lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"methods": {
                  Row: {
                    "id": string,"is_active": boolean,"key": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"is_active"?: boolean,"key": string,"name": string
                  }
                  Update: {
                    "id"?: string,"is_active"?: boolean,"key"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"id": string,"locale": string,"role": Database["public"]['Enums']["user_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"id": string,"locale"?: string,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"id"?: string,"locale"?: string,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Relationships: [
                    
                  ]
                },"series": {
                  Row: {
                    "block_id": string,"created_at": string,"id": string,"name": string,"owner_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "block_id": string,"created_at"?: string,"id"?: string,"name": string,"owner_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "block_id"?: string,"created_at"?: string,"id"?: string,"name"?: string,"owner_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "series_block_id_fkey"
      columns: ["block_id"]
isOneToOne: false
      referencedRelation: "blocks"
      referencedColumns: ["id"]
    }
                  ]
                },"series_items": {
                  Row: {
                    "exercise_id": string,"position": number,"series_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "exercise_id": string,"position"?: number,"series_id": string
                  }
                  Update: {
                    "exercise_id"?: string,"position"?: number,"series_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "series_items_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "series_items_series_id_fkey"
      columns: ["series_id"]
isOneToOne: false
      referencedRelation: "series"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "add_series_to_slot":
{ Args: { "p_series_id": string,"p_slot_id": string }; Returns: number
                           },
"can_write_lesson":
{ Args: { "p_id": string }; Returns: boolean
                           },
"can_write_slot":
{ Args: { "p_id": string }; Returns: boolean
                           },
"create_lesson":
{ Args: { "payload": Json }; Returns: string
                           },
"duplicate_lesson":
{ Args: { "p_id": string }; Returns: string
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"publish_class":
{ Args: { "p_id": string }; Returns: undefined
                           },
"reorder":
{ Args: { "p_ids": (string)[],"p_kind": string }; Returns: undefined
                           },
"save_exercise":
{ Args: { "payload": Json }; Returns: string
                           },
"save_preset":
{ Args: { "payload": Json }; Returns: string
                           },
"save_series":
{ Args: { "payload": Json }; Returns: string
                           }
          }
          Enums: {
            "equipment_kind": "apparatus"|"prop","exercise_level": "fundamental"|"intermediate"|"advanced","lesson_status": "draft"|"ready"|"taught","review_status": "needs_review"|"verified","user_role": "user"|"admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "equipment_kind": ["apparatus", "prop"],"exercise_level": ["fundamental", "intermediate", "advanced"],"lesson_status": ["draft", "ready", "taught"],"review_status": ["needs_review", "verified"],"user_role": ["user", "admin"]
          }
        }
} as const
