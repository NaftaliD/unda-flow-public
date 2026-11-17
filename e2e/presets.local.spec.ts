import { expect, test } from '@playwright/test'
import { signInViaMailpit, startNewClass } from './helpers.ts'

// Needs the local Supabase stack with the seed imported (see library.local.spec.ts).
test.skip(!process.env.E2E_LOCAL_SUPABASE, 'needs local Supabase (npm run db:start)')

test('save an equipment preset once, then set up a class from an example and the preset', async ({
  page,
  request,
}) => {
  await signInViaMailpit(page, request, `e2e-preset-${Date.now()}@example.com`)

  // First lesson: tick the equipment and save it as a preset.
  await startNewClass(page)
  await page.getByLabel('Title').fill('First')
  // The example comes with reformer and box already ticked.
  const equipment = page.getByRole('group', { name: 'Equipment available today' })
  await expect(equipment.getByRole('button', { name: 'Reformer' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Save as preset' }).click()
  await page.getByLabel('Preset name').fill('Studio')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Saved the preset “Studio”.')).toBeVisible()
  await page.getByRole('button', { name: 'Create class' }).click()
  // Wait for the builder (the new-lesson page has a Title field too).
  await expect(page.getByRole('list', { name: 'Class blocks' })).toBeVisible()

  // Second lesson: template (default) + preset, then straight to the builder.
  await page.getByRole('link', { name: 'Back to classes' }).click()
  await startNewClass(page)
  await page.getByLabel('Title').fill('Second')
  const again = page.getByRole('group', { name: 'Equipment available today' })
  // Clear what the example ticked, then loading the preset puts it back.
  await again.getByRole('button', { name: 'Reformer' }).click()
  await again.getByRole('button', { name: 'Box' }).click()
  await expect(again.getByRole('button', { name: 'Reformer' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await page.getByLabel('Load a preset').selectOption({ label: 'Studio' })
  await expect(again.getByRole('button', { name: 'Reformer' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(again.getByRole('button', { name: 'Box' })).toHaveAttribute('aria-pressed', 'true')
  await expect(again.getByRole('button', { name: 'Chair' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await page.getByRole('button', { name: 'Create class' }).click()

  const blocks = page.getByRole('list', { name: 'Class blocks' }).locator('> li')
  await expect(blocks).toHaveCount(12)
  // The equipment is summarised in the header; open the details to see the chips.
  await expect(page.getByText(/Reformer, Box/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Edit details' }).click()
  await expect(
    page
      .getByRole('group', { name: 'Equipment available today' })
      .getByRole('button', { name: 'Box' }),
  ).toHaveAttribute('aria-pressed', 'true')

  // Manage presets under More.
  await page.getByRole('link', { name: 'More', exact: true }).click()
  await page.getByRole('link', { name: /Equipment presets/ }).click()
  await expect(page.getByRole('heading', { name: 'My equipment presets' })).toBeVisible()
  const row = page.getByRole('listitem').filter({ hasText: 'Reformer, Box' })
  await row.getByLabel('Rename Studio').fill('Main studio')
  await row.getByLabel('Rename Studio').blur()
  await expect(page.getByLabel('Rename Main studio')).toBeVisible()
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Delete Main studio' }).click()
  await expect(page.getByText(/You have no presets yet/)).toBeVisible()
})
