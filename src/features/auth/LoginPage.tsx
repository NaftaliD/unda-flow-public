import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/components/Logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signInWithMagicLink } from '@/data/auth'

export function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus('sending')
    try {
      await signInWithMagicLink(email.trim())
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex justify-end p-4 text-foreground">
        <LanguageSwitcher />
      </header>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 pb-16">
        <Logo kind="full" tone="dark" className="mx-auto h-24" />

        {status === 'sent' ? (
          <section className="flex flex-col gap-3 rounded-3xl bg-card p-6 text-card-foreground">
            <h1 className="text-xl font-semibold">{t('login.checkEmailTitle')}</h1>
            <p className="text-sm">{t('login.checkEmailBody', { email })}</p>
            <Button variant="outline" onClick={() => setStatus('idle')}>
              {t('login.useAnother')}
            </Button>
          </section>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold">{t('login.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t('login.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                dir="ltr"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {status === 'error' && (
              <p role="alert" className="text-sm text-foreground">
                {t('login.error')}
              </p>
            )}
            <Button type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? t('login.sending') : t('login.submit')}
            </Button>
          </form>
        )}
      </div>
    </main>
  )
}
