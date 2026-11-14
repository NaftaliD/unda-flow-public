import { expect, test } from '@playwright/test'
import { signInViaMailpit } from './helpers.ts'

// Needs the local Supabase stack with the seed imported:
//   npm run db:start && npm run db:reset && npm run db:import   (see CLAUDE.md for the keys)
//   E2E_LOCAL_SUPABASE=1 VITE_SUPABASE_URL=... VITE_SUPABASE_PUBLISHABLE_KEY=... npm run e2e
test.skip(!process.env.E2E_LOCAL_SUPABASE, 'needs local Supabase (npm run db:start)')

test('browse and filter the shared library, then add a private exercise', async ({
  page,
  request,
}) => {
  await signInViaMailpit(page, request, `e2e-lib-${Date.now()}@example.com`)

  await page.getByRole('link', { name: 'Library', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Exercise library' })).toBeVisible()

  // Seeded shared content is visible to a brand-new user.
  await expect(page.getByText('Pelvic Curl')).toBeVisible()

  // The same movement on several apparatus is one entry listing its versions.
  await page.getByLabel('Search').fill('Calf Raises')
  await expect(page.getByText('Calf Raises')).toHaveCount(1)
  await expect(page.getByText(/\d+ versions/)).toBeVisible()
  await page.getByLabel('Search').fill('')

  // Chair only: mat/reformer/cadillac exercises disappear, chair exercises remain.
  const equipment = page.getByRole('group', { name: 'Equipment available today' })
  await equipment.getByRole('button', { name: 'Chair' }).click()
  await expect(page.getByText('Pelvic Curl')).toHaveCount(0)
  await expect(page.getByText('Calf Raises').first()).toBeVisible()
  await equipment.getByRole('button', { name: 'Chair' }).click()

  // A shared exercise is read-only for a normal user, with "Duplicate as mine".
  await page.getByRole('link', { name: /^Pelvic Curl/ }).click()
  await expect(page.getByRole('link', { name: 'Duplicate as mine' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Back to library' }).click()

  // No admin queue for a normal user.
  await expect(page.getByRole('link', { name: 'Review' })).toHaveCount(0)

  // Create a private exercise and find it under "Mine".
  const name = `E2E Move ${Date.now()}`
  await page.getByRole('link', { name: 'New exercise' }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Block').selectOption({ label: 'Warm-up' })
  await page.getByRole('button', { name: 'Add requirement' }).click()
  await page.getByRole('button', { name: 'Chair' }).click()
  await page.getByRole('button', { name: 'Create exercise' }).click()

  await expect(page).toHaveURL(/\/exercises$/)
  await page.getByRole('button', { name: 'Mine' }).click()
  await expect(page.getByText(name)).toBeVisible()
  await expect(page.getByText('1 exercise')).toBeVisible()
})
