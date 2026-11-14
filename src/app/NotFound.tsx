import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function NotFound() {
  const { t } = useTranslation()
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{t('notFound.title')}</h1>
      <Link to="/" className="text-sm font-semibold underline underline-offset-4">
        {t('notFound.back')}
      </Link>
    </main>
  )
}
