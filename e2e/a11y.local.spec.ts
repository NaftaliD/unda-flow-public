import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { signInViaMailpit } from './helpers.ts'

// Automated accessibility scan (axe, WCAG 2.0/2.1/2.2 A and AA) of the real pages, in both themes.
// Needs the local Supabase stack with the seed and example classes imported.
test.skip(!process.env.E2E_LOCAL_SUPABASE, 'needs local Supabase (npm run db:start)')

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function scan(page: Page, where: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  const report = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n    ` +
      v.nodes
        .slice(0, 3)
        .map((n) => `${n.target.join(' ')} -- ${n.failureSummary?.split('\n')[1] ?? ''}`)
        .join('\n    '),
  )
  expect.soft(report, `${where}\n${report.join('\n')}`).toEqual([])
}

for (const theme of ['light', 'dark'] as const) {
  test(`no accessibility violations in the ${theme} theme`, async ({ browser, request }) => {
    test.setTimeout(300_000)
    // Reduced motion: colours are read settled, not mid-transition.
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'reduce',
    })
    // Choose the theme before the app starts (the app reads this key at startup).
    await ctx.addInitScript((t) => localStorage.setItem('unda-theme', t), theme)
    const page = await ctx.newPage()

    // The sign-in page, before signing in.
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Send magic link' })).toBeVisible()
    await scan(page, `login (${theme})`)

    await signInViaMailpit(page, request, `e2e-a11y-${theme}-${Date.now()}@example.com`)
    await expect(page.getByRole('heading', { name: 'Classes', exact: true })).toBeVisible()
    expect(await page.evaluate('document.documentElement.dataset.theme')).toBe(theme)
    await scan(page, `class list, empty (${theme})`)

    // New class: the starting points, then the form.
    await page.getByRole('link', { name: 'New class' }).first().click()
    await expect(page.getByRole('heading', { name: 'Example classes' })).toBeVisible()
    await scan(page, `new class: starting points (${theme})`)
    await page.getByRole('link', { name: 'Preview' }).first().click()
    await expect(page.getByRole('link', { name: 'Use this class' })).toBeVisible()
    await scan(page, `example class preview (${theme})`)
    await page.goBack()
    await page.getByRole('link', { name: 'Use this class' }).first().click()
    await expect(page.getByLabel('Title')).toBeVisible()
    await scan(page, `new class: form (${theme})`)
    await page.getByRole('button', { name: 'Create class' }).click()
    await expect(page.getByRole('list', { name: 'Class blocks' })).toBeVisible()
    const builder = new URL(page.url()).pathname

    // The class builder: closed, with its details open, and with the Add dialog open.
    await scan(page, `class builder (${theme})`)
    await page.getByRole('button', { name: 'Edit details' }).click()
    await scan(page, `class builder, details open (${theme})`)
    const blocks = page.getByRole('list', { name: 'Class blocks' }).locator('> li')
    await blocks
      .filter({ has: page.getByRole('heading', { name: 'Foot work' }) })
      .getByRole('button', { name: /^Add$/ })
      .click()
    await expect(page.getByRole('dialog', { name: /Add to/ })).toBeVisible()
    await scan(page, `Add dialog, exercises (${theme})`)
    await page.getByRole('tab', { name: /^Sets/ }).click()
    await scan(page, `Add dialog, sets (${theme})`)
    await page.keyboard.press('Escape')

    for (const [path, name] of [
      [`${builder}/teach`, 'teach view'],
      [`${builder}/print`, 'print view'],
      ['/exercises', 'library, exercises'],
      ['/more', 'more'],
      ['/more/presets', 'equipment presets'],
      ['/more/blocks', 'my blocks'],
    ] as const) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await scan(page, `${name} (${theme})`)
    }

    // Library, Sets view; an exercise page.
    await page.goto('/exercises')
    await page.getByRole('button', { name: 'Sets', exact: true }).click()
    await expect(page.getByText('Reformer foot work').first()).toBeVisible()
    await scan(page, `library, sets (${theme})`)
    await page.getByRole('button', { name: 'Exercises', exact: true }).click()
    await page
      .getByRole('link', { name: /^Pelvic Curl(?! with)/ })
      .first()
      .click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await scan(page, `exercise page (${theme})`)

    // Hebrew (right-to-left): the same key pages.
    await page.goto('/')
    await page.getByRole('button', { name: /Language/ }).click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    for (const [path, name] of [
      ['/', 'class list'],
      ['/lessons/new', 'new class'],
      [builder, 'class builder'],
      [`${builder}/teach`, 'teach view'],
      ['/exercises', 'library'],
      ['/more', 'more'],
    ] as const) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await scan(page, `${name} in Hebrew (${theme})`)
    }

    await ctx.close()
  })
}
