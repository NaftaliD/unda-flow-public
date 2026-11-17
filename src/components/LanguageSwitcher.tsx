import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { Locale } from '@/app/i18n'

const LABELS: Record<Locale, string> = { en: 'English', he: 'עברית' }

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const current: Locale = i18n.resolvedLanguage === 'he' ? 'he' : 'en'
  const next: Locale = current === 'he' ? 'en' : 'he'

  return (
    <Button
      variant="ghost"
      size="sm"
      // The accessible name must contain the visible text (WCAG 2.5.3).
      aria-label={`${t('nav.language')}: ${LABELS[next]}`}
      lang={next}
      onClick={() => void i18n.changeLanguage(next)}
    >
      {LABELS[next]}
    </Button>
  )
}
