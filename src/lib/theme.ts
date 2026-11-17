import { useSyncExternalStore } from 'react'

/** The person's choice. "system" follows the device setting. */
export type ThemePref = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_KEY = 'unda-theme'
const QUERY = '(prefers-color-scheme: dark)'

export function resolveTheme(pref: ThemePref, systemDark: boolean): ResolvedTheme {
  return pref === 'dark' || (pref === 'system' && systemDark) ? 'dark' : 'light'
}

export function parsePref(value: string | null | undefined): ThemePref {
  return value === 'light' || value === 'dark' ? value : 'system'
}

function readStoredPref(): ThemePref {
  try {
    return parsePref(localStorage.getItem(THEME_KEY))
  } catch {
    return 'system' // storage blocked: the theme just is not remembered
  }
}

function systemDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia(QUERY).matches
}

// A tiny store so every component using the theme (the switcher, the toasts) stays in step.
let pref: ThemePref = readStoredPref()
const listeners = new Set<() => void>()

function apply() {
  document.documentElement.dataset.theme = resolveTheme(pref, systemDark())
  listeners.forEach((l) => l())
}

export function setThemePref(next: ThemePref) {
  pref = next
  try {
    if (next === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, next)
  } catch {
    /* not remembered */
  }
  apply()
}

/** Call once at startup: applies the theme and follows the device setting while on "system". */
export function initTheme() {
  pref = readStoredPref()
  apply()
  if (typeof matchMedia === 'function') {
    matchMedia(QUERY).addEventListener('change', () => {
      if (pref === 'system') apply()
    })
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme(): {
  pref: ThemePref
  resolved: ResolvedTheme
  setPref: (p: ThemePref) => void
} {
  const current = useSyncExternalStore(subscribe, () => pref)
  return { pref: current, resolved: resolveTheme(current, systemDark()), setPref: setThemePref }
}
