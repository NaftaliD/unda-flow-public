import { expect, test } from '@playwright/test'
import { signInViaMailpit } from './helpers.ts'

// Needs the local Supabase stack with the seed imported (see library.local.spec.ts).
test.skip(!process.env.E2E_LOCAL_SUPABASE, 'needs local Supabase (npm run db:start)')

test('save an equipment preset once, then set up a lesson from a template and the preset', async ({
  page,
  request,
}) => {
  await signInViaMailpit(page, request, `e2e-preset-${Date.now()}@example.com`)

  // First lesson: tick the equipment and save it as a preset.
  await page.getByRole('link', { name: 'New lesson' }).click()
  await page.getByLabel('Title').fill('First')
  const equipment = page.getByRole('group', { name: 'Equipment available today' })
  await equipment.getByRole('button', { name: 'Reformer' }).click()
  await equipment.getByRole('button', { name: 'Box' }).click()
  await page.getByRole('button', { name: 'Save as preset' }).click()
  await page.getByLabel('Preset name').fill('Studio')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Saved the preset “Studio”.')).toBeVisible()
  await page.getByRole('button', { name: 'Create lesson' }).click()
  // Wait for the builder (the new-lesson page has a Title field too).
  await expect(page.getByRole('list', { name: 'Lesson blocks' })).toBeVisible()

  // Second lesson: template (default) + preset, then straight to the builder.
  await page.getByRole('link', { name: 'Back to lessons' }).click()
  await page.getByRole('link', { name: 'New lesson' }).click()
  await page.getByLabel('Title').fill('Second')
  await page.getByLabel('Load a preset').selectOption({ label: 'Studio' })
  const again = page.getByRole('group', { name: 'Equipment available today' })
  await expect(again.getByRole('button', { name: 'Reformer' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(again.getByRole('button', { name: 'Box' })).toHaveAttribute('aria-pressed', 'true')
  await expect(again.getByRole('button', { name: 'Chair' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await page.getByRole('button', { name: 'Create lesson' }).click()

  const blocks = page.getByRole('list', { name: 'Lesson blocks' }).locator('> li')
  await expect(blocks).toHaveCount(12)
  await expect(
    page
      .getByRole('group', { name: 'Equipment available today' })
      .getByRole('button', { name: 'Box' }),
  ).toHaveAttribute('aria-pressed', 'true')

  // The builder can load another preset too; manage presets under Templates.
  await page.getByRole('link', { name: 'Templates', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'My equipment presets' })).toBeVisible()
  const row = page.getByRole('listitem').filter({ hasText: 'Reformer, Box' })
  await row.getByLabel('Rename Studio').fill('Main studio')
  await row.getByLabel('Rename Studio').blur()
  await expect(page.getByLabel('Rename Main studio')).toBeVisible()
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Delete Main studio' }).click()
  await expect(page.getByText(/You have no presets yet/)).toBeVisible()
})
