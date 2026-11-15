import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PresetsPanel } from '../presets/PresetsPanel'
import { BlocksPanel } from './BlocksPanel'

function Page({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <Link to="/more" className="text-sm font-semibold underline">
        {t('more.back')}
      </Link>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </section>
  )
}

export function PresetsPage() {
  const { t } = useTranslation()
  return (
    <Page title={t('more.presets')}>
      <PresetsPanel />
    </Page>
  )
}

export function BlocksPage() {
  const { t } = useTranslation()
  return (
    <Page title={t('more.blocks')}>
      <BlocksPanel />
    </Page>
  )
}
