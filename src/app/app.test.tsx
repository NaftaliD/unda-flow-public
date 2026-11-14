import { RouterProvider } from '@tanstack/react-router'
import { createMemoryHistory } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSession = vi.fn()

vi.mock('@/data/auth', () => ({
  getSession: () => getSession(),
  useSession: () => undefined,
  signInWithMagicLink: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('@/data/queries/profile', () => ({
  useProfile: () => ({ data: undefined }),
  useCurrentUser: () => ({ userId: 'u1', isAdmin: false }),
  fetchIsAdmin: () => Promise.resolve(false),
}))

import i18n from './i18n'
import { Providers } from './providers'
import { createAppRouter } from './router'

function renderAt(path: string) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }))
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}

describe('app', () => {
  beforeEach(async () => {
    getSession.mockReset()
    await i18n.changeLanguage('en')
  })

  it('redirects an anonymous visitor from / to /login', async () => {
    getSession.mockResolvedValue(null)
    const router = renderAt('/')
    await screen.findByRole('button', { name: /send magic link/i })
    expect(router.state.location.pathname).toBe('/login')
  })

  it('shows the home screen when signed in', async () => {
    getSession.mockResolvedValue({ user: { id: 'u1' } })
    const router = renderAt('/')
    await screen.findByText(/no lessons yet/i)
    expect(router.state.location.pathname).toBe('/')
  })

  it('switches to Hebrew and flips the document to rtl', async () => {
    getSession.mockResolvedValue(null)
    renderAt('/login')
    expect(document.documentElement.dir).toBe('ltr')
    await userEvent.click(await screen.findByRole('button', { name: /language/i }))
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'))
    expect(document.documentElement.lang).toBe('he')
    expect(await screen.findByText('שליחת קישור')).toBeInTheDocument()
  })
})
