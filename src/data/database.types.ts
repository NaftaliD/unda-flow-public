
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
                    "default_position": number,"goal": string | null,"id": string,"key": string,"method_id": string,"name": string,"owner_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "default_position"?: number,"goal"?: string | null,"id"?: string,"key": string,"method_id": string,"name": string,"owner_id"?: string | null
                  }
                  Update: {
                    "default_position"?: number,"goal"?: string | null,"id"?: string,"key"?: string,"method_id"?: string,"name"?: string,"owner_id"?: string | null
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
                },"exercise_equipment": {
                  Row: {
                    "alt_group": number,"equipment_id": string,"exercise_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_group"?: number,"equipment_id": string,"exercise_id": string
                  }
                  Update: {
                    "alt_group"?: number,"equipment_id"?: string,"exercise_id"?: string
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
                    "block_id": string,"created_at": string,"cues": string | null,"default_duration_sec": number | null,"default_reps": number | null,"default_springs": string | null,"description": string | null,"id": string,"is_archived": boolean,"level": Database["public"]['Enums']["exercise_level"],"media_url": string | null,"method_id": string,"name": string,"owner_id": string | null,"review_status": Database["public"]['Enums']["review_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "block_id": string,"created_at"?: string,"cues"?: string | null,"default_duration_sec"?: number | null,"default_reps"?: number | null,"default_springs"?: string | null,"description"?: string | null,"id"?: string,"is_archived"?: boolean,"level"?: Database["public"]['Enums']["exercise_level"],"media_url"?: string | null,"method_id": string,"name": string,"owner_id"?: string | null,"review_status"?: Database["public"]['Enums']["review_status"],"updated_at"?: string
                  }
                  Update: {
                    "block_id"?: string,"created_at"?: string,"cues"?: string | null,"default_duration_sec"?: number | null,"default_reps"?: number | null,"default_springs"?: string | null,"description"?: string | null,"id"?: string,"is_archived"?: boolean,"level"?: Database["public"]['Enums']["exercise_level"],"media_url"?: string | null,"method_id"?: string,"name"?: string,"owner_id"?: string | null,"review_status"?: Database["public"]['Enums']["review_status"],"updated_at"?: string
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
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"save_exercise":
{ Args: { "payload": Json }; Returns: string
                           }
          }
          Enums: {
            "equipment_kind": "apparatus"|"prop","exercise_level": "fundamental"|"intermediate"|"advanced","review_status": "needs_review"|"verified","user_role": "user"|"admin"
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
            "equipment_kind": ["apparatus", "prop"],"exercise_level": ["fundamental", "intermediate", "advanced"],"review_status": ["needs_review", "verified"],"user_role": ["user", "admin"]
          }
        }
} as const
