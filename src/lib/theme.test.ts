import { beforeEach, describe, expect, it } from 'vitest'
import { THEME_KEY, parsePref, resolveTheme, setThemePref } from './theme'

describe('resolveTheme', () => {
  it('follows the device on "system" and obeys an explicit choice', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })
})

describe('parsePref', () => {
  it('accepts light and dark, and treats anything else as system', () => {
    expect(parsePref('dark')).toBe('dark')
    expect(parsePref('light')).toBe('light')
    expect(parsePref('system')).toBe('system')
    expect(parsePref('purple')).toBe('system')
    expect(parsePref(null)).toBe('system')
  })
})

describe('setThemePref', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('applies the theme to the page and remembers an explicit choice', () => {
    setThemePref('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    setThemePref('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('forgets the choice on "system"', () => {
    setThemePref('dark')
    setThemePref('system')
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
  })
})
