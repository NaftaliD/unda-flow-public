import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/**
 * Raster logos keyed out of the brand boards (see brand/README.md and brand/extract_logos.py).
 * Each tone must sit on its own background: `light` artwork is for the olive app bar, `dark`
 * artwork for cream surfaces and print. `compact` drops the tagline for small sizes.
 * Replace with the designer's vector SVGs when they arrive; keep this component's API.
 */
const SIZES = {
  'full-light': [252, 95],
  'full-dark': [245, 95],
  'compact-light': [252, 70],
  'compact-dark': [245, 70],
} as const

const FILES = {
  'full-light': '/brand/logo-horizontal-light.png',
  'full-dark': '/brand/logo-horizontal-dark.png',
  'compact-light': '/brand/logo-compact-light.png',
  'compact-dark': '/brand/logo-compact-dark.png',
} as const

export function Logo({
  kind = 'compact',
  tone = 'light',
  className,
}: {
  kind?: 'full' | 'compact'
  /** `auto`: dark artwork on the light theme, light artwork on the dark theme (plain pages). */
  tone?: 'light' | 'dark' | 'auto'
  className?: string
}) {
  const { t } = useTranslation()
  if (tone === 'auto') {
    const w = (k: 'light' | 'dark') => SIZES[`${kind}-${k}`]
    return (
      <>
        <img
          src={FILES[`${kind}-dark`]}
          width={w('dark')[0]}
          height={w('dark')[1]}
          alt={t('app.logoAlt')}
          className={cn('w-auto select-none dark:hidden', className)}
          draggable={false}
        />
        <img
          src={FILES[`${kind}-light`]}
          width={w('light')[0]}
          height={w('light')[1]}
          alt=""
          aria-hidden
          className={cn('hidden w-auto select-none dark:inline', className)}
          draggable={false}
        />
      </>
    )
  }
  const key = `${kind}-${tone}` as const
  const [width, height] = SIZES[key]
  return (
    <img
      src={FILES[key]}
      width={width}
      height={height}
      alt={t('app.logoAlt')}
      className={cn('w-auto select-none', className)}
      draggable={false}
    />
  )
}
