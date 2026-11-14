import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConfigError } from './ConfigError'
import { Providers } from './providers'

describe('ConfigError', () => {
  it('names each missing variable', () => {
    render(
      <Providers>
        <ConfigError missing={['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']} />
      </Providers>,
    )
    expect(screen.getByRole('heading')).toBeInTheDocument()
    expect(screen.getByText('VITE_SUPABASE_URL')).toBeInTheDocument()
    expect(screen.getByText('VITE_SUPABASE_PUBLISHABLE_KEY')).toBeInTheDocument()
  })
})
