import { describe, expect, it } from 'vitest'
import { missingEnv } from './env'

describe('missingEnv', () => {
  it('reports nothing when both variables are set', () => {
    expect(
      missingEnv({
        VITE_SUPABASE_URL: 'https://x.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
      }),
    ).toEqual([])
  })

  it('reports missing and blank variables', () => {
    expect(missingEnv({ VITE_SUPABASE_URL: '  ' })).toEqual([
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_PUBLISHABLE_KEY',
    ])
  })

  it('does not accept the legacy anon key name', () => {
    expect(
      missingEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'eyJ...' }),
    ).toEqual(['VITE_SUPABASE_PUBLISHABLE_KEY'])
  })
})
