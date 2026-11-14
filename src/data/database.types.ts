// TEMPORARY hand-written stand-in matching supabase/migrations/*_profiles.sql.
// Replace with generated output: `npm run db:start && npm run db:types` (CI fails if they differ).
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      keep_alive: {
        Row: { id: number; pinged_at: string }
        Insert: { id?: number; pinged_at?: string }
        Update: { id?: number; pinged_at?: string }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          locale: string
          role: Database['public']['Enums']['user_role']
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          role?: Database['public']['Enums']['user_role']
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          role?: Database['public']['Enums']['user_role']
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      user_role: 'user' | 'admin'
    }
    CompositeTypes: { [_ in never]: never }
  }
}
