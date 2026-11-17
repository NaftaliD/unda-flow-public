import { expect, test } from '@playwright/test'
import { signInViaMailpit, startNewClass } from './helpers.ts'

// Needs the local Supabase stack with the seed imported (see library.local.spec.ts).
test.skip(!process.env.E2E_LOCAL_SUPABASE, 'needs local Supabase (npm run db:start)')

test('start from an example, copy your own class, and start blank with a custom block', async ({
  page,
  request,
}) => {
  await signInViaMailpit(page, request, `e2e-classes-${Date.now()}@example.com`)

  // The starting-point screen offers the shared example class (read-only preview) and blank.
  await page.getByRole('link', { name: 'New class' }).first().click()
  await expect(page.getByRole('heading', { name: 'Example classes' })).toBeVisible()
  await page.getByRole('link', { name: 'Preview' }).first().click()
  await expect(page.getByRole('heading', { name: 'Apparatus class - 12 blocks' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Use this class' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Add$/ })).toHaveCount(0) // read-only

  // Use it: the class length quick picks work and the example's name is the starting title.
  await page.getByRole('link', { name: 'Use this class' }).click()
  await expect(page.getByLabel('Title')).toHaveValue('Apparatus class - 12 blocks')
  await page.getByLabel('Title').fill('My first class')
  await page.getByRole('button', { name: '45 min' }).click()
  await expect(page.getByLabel('Class length (minutes)')).toHaveValue('45')
  await page.getByRole('button', { name: 'Create class' }).click()
  const blocks = page.getByRole('list', { name: 'Class blocks' }).locator('> li')
  await expect(blocks).toHaveCount(12)
  await expect(page.getByText('0 of 45 min · 45 min left')).toBeVisible()

  // Remove a block, then start a new class from this one: the copy has the same 11 blocks.
  await page.getByRole('button', { name: 'Remove block Extra leg' }).click()
  await expect(blocks).toHaveCount(11)
  await page.getByRole('link', { name: 'Back to classes' }).click()
  await page.getByRole('link', { name: 'New class' }).first().click()
  const recent = page.getByRole('listitem').filter({ hasText: 'My first class' })
  await recent.getByRole('link', { name: 'Use this class' }).click()
  await expect(page.getByLabel('Title')).toHaveValue('My first class (copy)')
  await page.getByRole('button', { name: 'Create class' }).click()
  await expect(blocks).toHaveCount(11)

  // A custom block of your own, then a blank class that uses it.
  await page.getByRole('link', { name: 'More', exact: true }).click()
  await page.getByRole('link', { name: /My blocks/ }).click()
  await page.getByLabel('Name', { exact: true }).fill('Core extras')
  await page.getByRole('button', { name: 'Add block' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Core extras' })).toBeVisible()

  await page.getByRole('link', { name: 'Classes', exact: true }).click()
  await startNewClass(page, 'blank')
  await page.getByLabel('Title').fill('Blank class')
  await page.getByRole('button', { name: 'Create class' }).click()
  await expect(page.getByText('This class has no blocks yet')).toBeVisible()
  await page.getByRole('button', { name: 'Add block' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add a block' })
  await dialog.getByLabel('Block', { exact: true }).selectOption({ label: 'Core extras' })
  await dialog.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Core extras' })).toBeVisible()
})
