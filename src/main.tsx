import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app/theme.css'
import { ConfigError } from './app/ConfigError'
import { Providers } from './app/providers'
import { missingEnv } from './data/env'
import { initTheme } from './lib/theme'

async function main() {
  initTheme()
  const root = createRoot(document.getElementById('root')!)
  const missing = missingEnv()

  if (missing.length > 0) {
    root.render(
      <StrictMode>
        <Providers>
          <ConfigError missing={missing} />
        </Providers>
      </StrictMode>,
    )
    return
  }

  // Imported lazily: the router pulls in the Supabase client, which requires the env variables.
  const { createAppRouter } = await import('./app/router')
  root.render(
    <StrictMode>
      <Providers>
        <RouterProvider router={createAppRouter()} />
      </Providers>
    </StrictMode>,
  )
}

void main()
