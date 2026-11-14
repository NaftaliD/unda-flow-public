/** Build-time Vite variables the app cannot run without. */
export const REQUIRED_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'] as const

/** Names of required variables that are missing or empty. */
export function missingEnv(env: Record<string, unknown> = import.meta.env): string[] {
  return REQUIRED_ENV.filter((name) => {
    const value = env[name]
    return typeof value !== 'string' || value.trim() === ''
  })
}
