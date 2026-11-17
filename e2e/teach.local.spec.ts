import { expect, test } from '@playwright/test'
import { signInViaMailpit, startNewClass } from './helpers.ts'

// Needs the local Supabase stack with the seed and example classes imported.
test.skip(!process.env.E2E_LOCAL_SUPABASE, 'needs local Supabase (npm run db:start)')

test('teach a class on a phone: step through it, jump to a block, finish and mark it taught', async ({
  browser,
  request,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await ctx.newPage()
  await signInViaMailpit(page, request, `e2e-teach-${Date.now()}@example.com`)
  await startNewClass(page)
  await page.getByLabel('Title').fill('Teach me')
  await page.getByRole('button', { name: 'Create class' }).click()
  await expect(page.getByRole('list', { name: 'Class blocks' })).toBeVisible()

  await page.getByRole('link', { name: 'Teach' }).click()

  // One exercise at a time, in large type, with the app chrome out of the way.
  await expect(page.getByRole('heading', { level: 1, name: 'Pelvic Curl' })).toBeVisible()
  await expect(page.getByText(/^Exercise 1 of \d+$/)).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Sections' })).toBeHidden()
  const { scrollWidth, innerWidth } = (await page.evaluate(
    '({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth })',
  )) as { scrollWidth: number; innerWidth: number }
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Chest Lift' })).toBeVisible()
  await page.getByRole('button', { name: 'Previous' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pelvic Curl' })).toBeVisible()

  // Jump to the last block, then finish.
  const jump = page.getByLabel('Jump to a block')
  const options = await jump.locator('option').allTextContents()
  await jump.selectOption({ label: options[options.length - 1]! })
  await expect(page.getByRole('heading', { level: 1, name: 'Swan Prep' })).toBeVisible()
  await page.getByRole('button', { name: 'Finish' }).click()
  await expect(page.getByRole('heading', { name: 'Class complete' })).toBeVisible()
  await page.getByRole('button', { name: 'Mark as taught' }).click()
  await expect(page.getByText('Marked as taught.')).toBeVisible()

  // The place survives a reload (here: the finished state).
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Class complete' })).toBeVisible()

  await page.getByRole('link', { name: 'Exit' }).click()
  await expect(page.getByLabel('Title')).toHaveValue('Teach me')
  await ctx.close()
})
