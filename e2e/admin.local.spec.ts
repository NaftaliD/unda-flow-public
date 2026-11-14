import { execFileSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { signInViaMailpit } from './helpers.ts'

// Needs the local Supabase stack with the seed imported (see library.local.spec.ts).
test.skip(!process.env.E2E_LOCAL_SUPABASE, 'needs local Supabase (npm run db:start)')

function psql(sql: string) {
  // Direct database access has no JWT, which is how the first admin is made in production too.
  execFileSync('docker', ['exec', 'supabase_db_unda-flow', 'psql', '-U', 'postgres', '-c', sql])
}

test('an admin verifies a shared exercise from the review queue', async ({ page, request }) => {
  const email = `e2e-admin-${Date.now()}@example.com`
  await signInViaMailpit(page, request, email)
  await expect(page.getByRole('link', { name: 'Review' })).toHaveCount(0)

  psql(
    `update public.profiles set role = 'admin' where id = (select id from auth.users where email = '${email}')`,
  )
  await page.reload()
  await page.getByRole('link', { name: 'Review' }).click()
  await expect(page.getByRole('heading', { name: 'Review queue' })).toBeVisible()

  const remaining = page.getByText(/\d+ exercises? to review/)
  const before = Number(/\d+/.exec(await remaining.innerText())?.[0])
  expect(before).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Verify' }).first().click()
  await expect(remaining).toHaveText(
    before - 1 === 1 ? '1 exercise to review' : `${before - 1} exercises to review`,
  )
})
