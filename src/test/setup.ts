import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// The Supabase client throws without env vars; tests never hit the network.
vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')

// jsdom does not implement scrolling; the router calls it on navigation.
window.scrollTo = vi.fn()

afterEach(() => {
  cleanup()
  localStorage.clear()
})
