import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import { signOut } from '@/data/auth'
import { useCurrentUser } from '@/data/queries/profile'

function NavLink({
  to,
  children,
}: {
  to: '/' | '/exercises' | '/templates' | '/series' | '/admin/review'
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === '/' }}
      className="rounded-pill px-3 py-1.5 hover:bg-primary-foreground/15 data-[status=active]:bg-primary-foreground/20"
    >
      {children}
    </Link>
  )
}

export function AppLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAdmin } = useCurrentUser()

  async function onSignOut() {
    await signOut()
    await navigate({ to: '/login' })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        dir="ltr"
        className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground print:hidden"
      >
        <div className="flex items-center gap-4">
          <Link
            to="/"
            aria-label={t('nav.home')}
            className="rounded-pill focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <Logo kind="compact" tone="light" className="h-7 sm:h-9" />
          </Link>
          <nav aria-label={t('nav.main')} className="flex items-center gap-1 text-sm font-semibold">
            <NavLink to="/">{t('nav.lessons')}</NavLink>
            <NavLink to="/exercises">{t('nav.library')}</NavLink>
            <NavLink to="/templates">{t('nav.templates')}</NavLink>
            <NavLink to="/series">{t('nav.series')}</NavLink>
            {isAdmin && <NavLink to="/admin/review">{t('nav.review')}</NavLink>}
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => void onSignOut()}
          >
            {t('nav.signOut')}
          </Button>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
