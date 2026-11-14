import { useTranslation } from 'react-i18next'
import { WaveDivider } from '@/components/WaveDivider'
import { useSession } from '@/data/auth'
import { useProfile } from '@/data/queries/profile'

export function HomePage() {
  const { t } = useTranslation()
  const session = useSession()
  const { data: profile } = useProfile(session?.user.id)
  const name = profile?.display_name

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">
        {name ? t('home.greeting', { name }) : t('home.greetingAnonymous')}
      </h1>
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-card px-6 py-16 text-center text-card-foreground">
        <WaveDivider />
        <h2 className="text-lg font-semibold">{t('home.emptyTitle')}</h2>
        <p className="max-w-xs text-sm text-muted-foreground">{t('home.emptyBody')}</p>
      </div>
    </section>
  )
}
