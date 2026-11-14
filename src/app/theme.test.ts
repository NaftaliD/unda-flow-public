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

describe('theme contrast (WCAG AA, 4.5:1)', () => {
  it.each(TEXT_PAIRS)('%s on %s', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5)
  })
})
