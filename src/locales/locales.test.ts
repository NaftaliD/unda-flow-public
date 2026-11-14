import { describe, expect, it } from 'vitest'
import en from './en.json'
import he from './he.json'

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )
}

describe('locales', () => {
  it('en and he have identical key sets', () => {
    // Plural forms differ per language (en: one/other, he: one/two/other), so compare base keys.
    const base = (list: string[]) =>
      [...new Set(list.map((k) => k.replace(/_(zero|one|two|few|many|other)$/, '')))].sort()
    expect(base(keys(he))).toEqual(base(keys(en)))
  })

  it('he has no empty strings', () => {
    expect(keys(he).length).toBeGreaterThan(0)
    expect(JSON.stringify(he)).not.toContain('""')
  })
})
