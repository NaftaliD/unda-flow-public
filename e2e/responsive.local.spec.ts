import { expect, test, type Page } from '@playwright/test'
import { signInViaMailpit } from './helpers.ts'

// Needs the local Supabase stack with the seed imported (see library.local.spec.ts).
test.skip(!process.env.E2E_LOCAL_SUPABASE, 'needs local Supabase (npm run db:start)')

const SIZES = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
]

/** The page must never be wider than the screen: no horizontal scroll, header and tabs in view. */
async function expectNoOverflow(page: Page, where: string) {
  const { scrollWidth, innerWidth } = (await page.evaluate(
    '({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth })',
  )) as { scrollWidth: number; innerWidth: number }
  expect(scrollWidth, `${where}: scrollWidth ${scrollWidth} > ${innerWidth}`).toBeLessThanOrEqual(
    innerWidth,
  )
}

for (const size of SIZES) {
  for (const lang of ['en', 'he'] as const) {
    test(`no horizontal overflow at ${size.width}px in ${lang}`, async ({ browser, request }) => {
      test.setTimeout(120_000)
      const ctx = await browser.newContext({ viewport: size, isMobile: true, hasTouch: true })
      const page = await ctx.newPage()
      await signInViaMailpit(
        page,
        request,
        `e2e-resp-${size.width}-${lang}-${Date.now()}@example.com`,
      )
      // Wait until the session is established before navigating away.
      await expect(page.getByRole('heading', { name: 'Classes', exact: true })).toBeVisible()
      if (lang === 'he') {
        await page.getByRole('button', { name: 'Language' }).click()
      }

      // Seed one class so the list and builder have content.
      await page.goto('/lessons/new')
      // The first starting point is the shared example class, in either language.
      await page.locator('a[href*="from="]').first().click()
      await page.getByLabel(/Title|שם השיעור/).fill('Responsive check')
      await page.locator('button[type=submit]').click()
      await page.getByRole('list').first().waitFor()
      const builderUrl = page.url()

      const routes = [
        '/',
        '/lessons/new',
        '/lessons/new?from=blank',
        builderUrl.replace(/^https?:\/\/[^/]+/, ''),
        '/exercises',
        '/series',
        '/more',
        '/more/presets',
        '/more/blocks',
      ]
      for (const r of routes) {
        await page.goto(r)
        await page.waitForTimeout(500)
        await expectNoOverflow(page, `${lang} ${size.width} ${r}`)
        // The logo and the bottom tab bar are on screen.
        const logo = await page
          .getByRole('img', { name: /Unda|אונדה/ })
          .first()
          .boundingBox()
        expect(logo, `${r}: logo visible`).not.toBeNull()
        expect(logo!.x + logo!.width, `${r}: logo inside the screen`).toBeLessThanOrEqual(
          size.width,
        )
        await expect(page.getByRole('navigation', { name: /Sections|מקטעים/ })).toBeVisible()
      }

      // A dialog fits the screen too.
      await page.goto(builderUrl.replace(/^https?:\/\/[^/]+/, ''))
      await page.getByRole('button', { name: /^(Add block|הוספת בלוק)$/ }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      const box = await dialog.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(size.width)

      await ctx.close()
    })
  }
}
