import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Read from disk: importing the CSS with ?raw goes through the Tailwind plugin and is rewritten.
// (Tests run from the repo root; import.meta.url is not a file: URL under jsdom.)
const css = readFileSync(resolve(process.cwd(), 'src/app/theme.css'), 'utf8')

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match?.[1]) throw new Error(`Token --${name} not found in theme.css`)
  return match[1]
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

// Declared text/background pairs. Terracotta and sage are deliberately absent: fills/accents only.
const TEXT_PAIRS: [string, string][] = [
  ['ink', 'cream'],
  ['ink', 'warm-cream'],
  ['cream', 'olive'],
  ['ink-muted', 'cream'],
  ['ink-muted', 'warm-cream'],
  ['ink', 'sage'],
]

describe('light theme text contrast (WCAG AA, 4.5:1)', () => {
  it.each(TEXT_PAIRS)('%s on %s', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5)
  })
})

// Non-text contrast (WCAG 1.4.11, 3:1): control borders, the focus ring, meter fills.
const LIGHT_NON_TEXT: [string, string][] = [
  ['sage-deep', 'cream'], // borders on the page
  ['sage-deep', 'warm-cream'], // borders on cards
  ['terracotta-deep', 'cream'], // focus ring on the page
  ['terracotta-deep', 'warm-cream'], // focus ring on cards
  ['olive', 'cream'], // primary fills (buttons, progress)
  ['olive', 'warm-cream'],
]

describe('light theme non-text contrast (3:1)', () => {
  it.each(LIGHT_NON_TEXT)('%s on %s', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(3)
  })
})

// The olive dark theme.
const DARK_TEXT: [string, string][] = [
  ['night-text', 'night'],
  ['night-text', 'night-card'],
  ['night-text', 'night-raised'], // hover and neutral fills on cards
  ['night-muted', 'night'],
  ['night-muted', 'night-card'],
  ['night-muted', 'night-raised'],
  ['night-text', 'night-secondary'],
  ['night-text', 'night-header'],
  ['night', 'night-primary'], // text on the primary buttons and selected chips
]
const DARK_NON_TEXT: [string, string][] = [
  ['night-border', 'night'],
  ['night-border', 'night-card'],
  ['night-accent', 'night'], // focus ring
  ['night-accent', 'night-card'],
  ['night-border', 'night-raised'],
  ['night-primary', 'night'], // primary fills
  ['night-primary', 'night-card'],
]

describe('dark theme contrast', () => {
  it.each(DARK_TEXT)('text %s on %s (4.5:1)', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5)
  })
  it.each(DARK_NON_TEXT)('non-text %s on %s (3:1)', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(3)
  })
})

describe('dark theme wiring', () => {
  it('overrides the semantic tokens on screen only, so printouts stay light', () => {
    const start = css.indexOf('@media screen')
    const block = css.slice(start, css.indexOf('}', css.indexOf("data-theme='dark'", start)))
    expect(start).toBeGreaterThan(-1)
    expect(block).toContain("[data-theme='dark']")
    for (const name of [
      'background',
      'foreground',
      'card',
      'primary',
      'primary-foreground',
      'border',
      'ring',
      'header',
      'header-foreground',
    ]) {
      expect(block, `--${name}`).toContain(`--${name}:`)
    }
  })
})
