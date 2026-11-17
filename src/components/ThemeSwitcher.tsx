import { useTranslation } from 'react-i18next'
import { Chip } from '@/components/ui/chip'
import { useTheme, type ThemePref } from '@/lib/theme'

const CHOICES: ThemePref[] = ['system', 'light', 'dark']

/** Appearance: follow the device, or force the light or the olive dark theme. */
export function ThemeSwitcher() {
  const { t } = useTranslation()
  const { pref, setPref } = useTheme()
  return (
    <div className="flex flex-col gap-2">
      <h2 id="appearance" className="text-lg font-semibold">
        {t('theme.title')}
      </h2>
      <div role="group" aria-labelledby="appearance" className="flex flex-wrap gap-1.5">
        {CHOICES.map((c) => (
          <Chip key={c} selected={pref === c} onClick={() => setPref(c)}>
            {t(`theme.${c}`)}
          </Chip>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{t('theme.help')}</p>
    </div>
  )
}
