import { expect, test } from '@playwright/test'
import { signInViaMailpit } from './helpers.ts'

// Needs the local Supabase stack with the seed imported (see library.local.spec.ts).
test.skip(!process.env.E2E_LOCAL_SUPABASE, 'needs local Supabase (npm run db:start)')

test('copy a shared template, plan from it, add a custom block, save a lesson as a template', async ({
  page,
  request,
}) => {
  await signInViaMailpit(page, request, `e2e-tpl-${Date.now()}@example.com`)

  // The shared template is visible and read-only for a normal user; duplicate it.
  await page.getByRole('link', { name: 'Templates', exact: true }).click()
  const shared = page.getByRole('listitem').filter({ hasText: 'Apparatus class - 12 blocks' })
  await expect(shared.getByRole('link', { name: 'View' })).toBeVisible()
  await shared.getByRole('button', { name: 'Duplicate as mine' }).click()

  // The copy opens in the editor: rename it and drop one block.
  await expect(page.getByLabel('Name')).toHaveValue('Apparatus class - 12 blocks (copy)')
  await page.getByLabel('Name').fill('My short class')
  await page.getByRole('button', { name: 'Remove block Extra leg' }).click()
  await page.getByRole('button', { name: 'Save template' }).click()

  const mine = page.getByRole('listitem').filter({ hasText: 'My short class' })
  await expect(mine).toContainText('11 blocks')

  // A custom block of our own.
  await page.getByLabel('Name', { exact: true }).fill('Core extras')
  await page.getByRole('button', { name: 'Add block' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Core extras' })).toBeVisible()

  // A lesson from the new template gets its 11 blocks.
  await page.getByRole('link', { name: 'Lessons', exact: true }).click()
  await page.getByRole('link', { name: 'New lesson' }).click()
  await page.getByLabel('Title').fill('From my template')
  await page.getByLabel('Template').selectOption({ label: 'My short class' })
  await page.getByRole('button', { name: 'Create lesson' }).click()
  const blocks = page.getByRole('list', { name: 'Lesson blocks' }).locator('> li')
  await expect(blocks).toHaveCount(11)

  // Save that lesson as a template of its own.
  await page.getByRole('button', { name: 'Save as template' }).click()
  await page.getByLabel('Template name').fill('Saved from lesson')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Saved as a template.')).toBeVisible()

  // A blank lesson starts with no blocks; add the custom block.
  await page.getByRole('link', { name: 'Back to lessons' }).click()
  await page.getByRole('link', { name: 'New lesson' }).click()
  await page.getByLabel('Title').fill('Blank lesson')
  await page.getByLabel('Template').selectOption({ label: 'Blank lesson (add blocks yourself)' })
  await page.getByRole('button', { name: 'Create lesson' }).click()
  await expect(page.getByText('This lesson has no blocks yet')).toBeVisible()
  await page.getByRole('button', { name: 'Add block' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add a block' })
  await dialog.getByLabel('Block', { exact: true }).selectOption({ label: 'Core extras' })
  await dialog.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Core extras' })).toBeVisible()
})
