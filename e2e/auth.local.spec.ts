import { expect, test } from '@playwright/test'
import { signInViaMailpit } from './helpers.ts'

// Needs the local Supabase stack. Run with:
//   E2E_LOCAL_SUPABASE=1 VITE_SUPABASE_URL=... VITE_SUPABASE_PUBLISHABLE_KEY=... npm run e2e
// (the values are printed by `npm run db:start`). Skipped unless E2E_LOCAL_SUPABASE is set.
test.skip(!process.env.E2E_LOCAL_SUPABASE, 'needs local Supabase (npm run db:start)')

test('magic link signs in, shows the profile greeting, and signs out', async ({
  page,
  request,
}) => {
  const local = `e2e-${Date.now()}`
  await signInViaMailpit(page, request, `${local}@example.com`)

  // The greeting uses profiles.display_name, which the signup trigger sets to the email prefix,
  // so this also proves the trigger and the "select own profile" RLS policy work end to end.
  await expect(page.getByRole('heading', { name: `Hello, ${local}` })).toBeVisible()
  await expect(page.getByText('No lessons yet')).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
