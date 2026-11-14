import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { missingEnv } from './env'

// main.tsx shows a configuration screen before this module loads when variables are missing;
// this is the backstop for any other import path.
const missing = missingEnv()
if (missing.length > 0) {
  throw new Error(`Missing build-time environment variables: ${missing.join(', ')}`)
}

// Publishable key (sb_publishable_...). Never use the secret key or legacy JWT keys in the client.
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)
