import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { Toaster } from 'sonner'
import { useTheme } from '@/lib/theme'
import i18n from './i18n'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const { resolved } = useTheme()
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          theme={resolved}
          position="bottom-center"
          mobileOffset={{ bottom: 76, left: 16, right: 16 }}
        />
      </QueryClientProvider>
    </I18nextProvider>
  )
}
