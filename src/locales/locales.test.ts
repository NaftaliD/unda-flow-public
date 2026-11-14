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
    expect(keys(he).sort()).toEqual(keys(en).sort())
  })

  it('he has no empty strings', () => {
    expect(keys(he).length).toBeGreaterThan(0)
    expect(JSON.stringify(he)).not.toContain('""')
  })
})
