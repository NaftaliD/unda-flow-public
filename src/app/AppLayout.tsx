import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { BookOpen, ClipboardList, Menu } from 'lucide-react'
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
  to: '/' | '/exercises' | '/more' | '/admin/review'
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === '/' }}
      className="rounded-pill px-3 py-1.5 hover:bg-black/15 focus-visible:outline-2 focus-visible:outline-header-foreground data-[status=active]:bg-black/25"
    >
      {children}
    </Link>
  )
}

function TabLink({
  to,
  icon,
  active,
  children,
}: {
  to: '/' | '/exercises' | '/more'
  icon: ReactNode
  active: boolean
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-header-foreground ${active ? 'bg-black/25' : 'hover:bg-black/15'}`}
    >
      {icon}
      {children}
    </Link>
  )
}

/** Where the "More" tab is the active section (everything that is not Classes or Library). */
const MORE_PREFIXES = ['/more', '/admin']

export function AppLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAdmin } = useCurrentUser()
  const path = useRouterState({ select: (s) => s.location.pathname })

  async function onSignOut() {
    await signOut()
    await navigate({ to: '/login' })
  }

  const onMore = MORE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
  const onLibrary = path === '/exercises' || path.startsWith('/exercises/')
  // The teach view uses the whole screen: no app header or tab bar.
  const immersive = path.endsWith('/teach')

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        onClick={(e) => {
          // Move focus without touching the address (the router owns the URL).
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-pill focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:outline-2 focus:outline-ring"
      >
        {t('nav.skip')}
      </a>
      <header
        dir="ltr"
        hidden={immersive}
        className="flex items-center justify-between bg-header px-4 py-3 text-header-foreground print:hidden"
      >
        <div className="flex items-center gap-4">
          <Link
            to="/"
            aria-label={t('nav.home')}
            className="rounded-pill focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-header-foreground"
          >
            <Logo kind="compact" tone="light" className="h-7 sm:h-9" />
          </Link>
          <nav
            aria-label={t('nav.main')}
            className="hidden items-center gap-1 text-sm font-semibold md:flex"
          >
            <NavLink to="/">{t('nav.lessons')}</NavLink>
            <NavLink to="/exercises">{t('nav.library')}</NavLink>
            <NavLink to="/more">{t('nav.more')}</NavLink>
            {isAdmin && <NavLink to="/admin/review">{t('nav.review')}</NavLink>}
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="sm"
            className="hidden whitespace-nowrap md:inline-flex"
            onClick={() => void onSignOut()}
          >
            {t('nav.signOut')}
          </Button>
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className={`flex-1 outline-none print:pb-0 ${immersive ? '' : 'pb-20 md:pb-0'}`}
      >
        <Outlet />
      </main>
      <nav
        aria-label={t('nav.tabs')}
        hidden={immersive}
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 bg-header text-header-foreground md:hidden print:hidden"
      >
        <TabLink
          to="/"
          active={!onMore && !onLibrary}
          icon={<ClipboardList className="size-5" aria-hidden />}
        >
          {t('nav.lessons')}
        </TabLink>
        <TabLink
          to="/exercises"
          active={onLibrary}
          icon={<BookOpen className="size-5" aria-hidden />}
        >
          {t('nav.library')}
        </TabLink>
        <TabLink to="/more" active={onMore} icon={<Menu className="size-5" aria-hidden />}>
          {t('nav.more')}
        </TabLink>
      </nav>
    </div>
  )
}
