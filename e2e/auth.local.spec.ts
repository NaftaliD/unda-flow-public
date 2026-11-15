import { expect, test } from '@playwright/test'
import { signInViaMailpit } from './helpers.ts'

// Needs the local Supabase stack. Run with:
//   E2E_LOCAL_SUPABASE=1 VITE_SUPABASE_URL=... VITE_SUPABASE_PUBLISHABLE_KEY=... npm run e2e
// (the values are printed by `npm run db:start`). Skipped unless E2E_LOCAL_SUPABASE is set.
test.skip(!process.env.E2E_LOCAL_SUPABASE, 'needs local Supabase (npm run db:start)')

test('magic link signs in, lands on the class list, and signs out', async ({ page, request }) => {
  const local = `e2e-${Date.now()}`
  await signInViaMailpit(page, request, `${local}@example.com`)

  // No greeting: the signup trigger's display name is just the email prefix, so the page title
  // is shown instead (the profile trigger and RLS are covered by the pgTAP tests).
  await expect(page.getByRole('heading', { name: 'Classes', exact: true })).toBeVisible()
  await expect(page.getByText(`Hello, ${local}`)).toHaveCount(0)
  await expect(page.getByText('No classes yet')).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
