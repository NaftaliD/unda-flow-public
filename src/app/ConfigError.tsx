import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

/** Shown instead of the app when build-time configuration is missing. */
export function ConfigError({ missing }: { missing: string[] }) {
  const { t } = useTranslation()
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>
      <h1 className="text-xl font-semibold">{t('config.title')}</h1>
      <p className="text-sm">{t('config.body')}</p>
      <ul dir="ltr" className="rounded-3xl bg-card p-4 font-mono text-sm text-card-foreground">
        {missing.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </main>
  )
}
