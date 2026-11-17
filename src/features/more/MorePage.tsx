import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { signOut } from '@/data/auth'
import { useCurrentUser } from '@/data/queries/profile'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

type Entry = {
  to: '/more/presets' | '/more/blocks' | '/admin/review'
  title: string
  body: string
}

/** Everything that does not fit in the phone tab bar: the secondary sections and sign out. */
export function MorePage() {
  const { t } = useTranslation()
  useDocumentTitle(t('more.title'))
  const navigate = useNavigate()
  const { isAdmin } = useCurrentUser()

  const entries: Entry[] = [
    { to: '/more/presets', title: t('more.presets'), body: t('more.presetsBody') },
    { to: '/more/blocks', title: t('more.blocks'), body: t('more.blocksBody') },
    ...(isAdmin
      ? [{ to: '/admin/review' as const, title: t('nav.review'), body: t('more.reviewBody') }]
      : []),
  ]

  async function onSignOut() {
    await signOut()
    await navigate({ to: '/login' })
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">{t('more.title')}</h1>
      <ul className="flex flex-col gap-3">
        {entries.map((e) => (
          <li key={e.to}>
            <Link
              to={e.to}
              className="flex items-center justify-between gap-3 rounded-3xl bg-card p-4 text-card-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-base font-semibold">{e.title}</span>
                <span className="text-sm text-muted-foreground">{e.body}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 rtl:rotate-180" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <ThemeSwitcher />
      <div>
        <Button variant="outline" onClick={() => void onSignOut()}>
          {t('nav.signOut')}
        </Button>
      </div>
    </section>
  )
}
