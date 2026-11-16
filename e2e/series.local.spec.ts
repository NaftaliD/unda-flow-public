import { expect, test } from '@playwright/test'
import { signInViaMailpit, startNewClass } from './helpers.ts'

// Needs the local Supabase stack with the seed imported (the sample CSV defines the series).
test.skip(!process.env.E2E_LOCAL_SUPABASE, 'needs local Supabase (npm run db:start)')

test('add a shared series to a class block, then build a series of your own', async ({
  page,
  request,
}) => {
  await signInViaMailpit(page, request, `e2e-series-${Date.now()}@example.com`)

  // A class with the reformer.
  await startNewClass(page)
  await page.getByLabel('Title').fill('Series class')
  await page
    .getByRole('group', { name: 'Equipment available today' })
    .getByRole('button', { name: 'Reformer' })
    .click()
  await page.getByRole('button', { name: 'Create class' }).click()

  // Add the whole foot-work series in one action.
  const blocks = page.getByRole('list', { name: 'Class blocks' }).locator('> li')
  const footWork = blocks.filter({ has: page.getByRole('heading', { name: 'Foot work' }) })
  await footWork.getByRole('button', { name: 'Add series' }).click()
  const dialog = page.getByRole('dialog', { name: /Add a series to/ })
  await dialog.getByRole('button', { name: /Reformer foot work/ }).click()
  await expect(page.getByText('Added 3 exercises.')).toBeVisible()
  // 3 foot-work exercises at 45 s each: about 2 minutes, shown on the block and in the time bar
  await expect(footWork.getByText(/3 exercises · 2 min/)).toBeVisible()
  await expect(page.getByText(/^2 min planned/)).toBeVisible()

  // The three exercises arrive in series order.
  const rows = footWork.getByRole('list').getByRole('listitem')
  await expect(rows).toHaveCount(3)
  await expect(rows.nth(0)).toContainText('Calf Raises')
  await expect(rows.nth(1)).toContainText('Heels')
  await expect(rows.nth(2)).toContainText('Arches')

  // Persisted across a reload.
  await page.reload()
  await expect(
    page
      .getByRole('list', { name: 'Class blocks' })
      .locator('> li')
      .filter({ has: page.getByRole('heading', { name: 'Foot work' }) })
      .getByRole('list')
      .getByRole('listitem'),
  ).toHaveCount(3)

  // Series page: the shared one is view-only; build a private one.
  await page.getByRole('link', { name: 'Series', exact: true }).click()
  const shared = page.getByRole('listitem').filter({ hasText: 'Reformer foot work' })
  await expect(shared.getByRole('link', { name: 'View' })).toBeVisible()

  await page.getByRole('link', { name: 'New series' }).click()
  await page.getByLabel('Name').fill('My warm-up set')
  await page.getByLabel('Block', { exact: true }).selectOption({ label: 'Warm-up' })
  await page.getByRole('button', { name: 'Add exercise' }).click()
  const picker = page.getByRole('dialog', { name: /Add to/ })
  await picker.getByRole('listitem').first().getByRole('button').click()
  await picker.getByRole('button', { name: 'Done' }).click()
  await page.getByRole('button', { name: 'Save series' }).click()

  const mine = page.getByRole('listitem').filter({ hasText: 'My warm-up set' })
  await expect(mine).toContainText('1 exercise')
})
