import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en.json'
import he from '@/locales/he.json'

export const SUPPORTED_LOCALES = ['en', 'he'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

const RTL_LOCALES: readonly string[] = ['he']

export function directionFor(locale: string): 'rtl' | 'ltr' {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr'
}

function applyDocumentLocale(locale: string) {
  document.documentElement.lang = locale
  document.documentElement.dir = directionFor(locale)
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, he: { translation: he } },
    supportedLngs: SUPPORTED_LOCALES,
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  })

applyDocumentLocale(i18n.resolvedLanguage ?? 'en')
i18n.on('languageChanged', applyDocumentLocale)

export default i18n
