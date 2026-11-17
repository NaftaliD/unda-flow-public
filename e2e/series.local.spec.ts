import { execFileSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { signInViaMailpit, startNewClass } from './helpers.ts'

// Needs the local Supabase stack with the seed imported (the sample CSV defines the sets).
test.skip(!process.env.E2E_LOCAL_SUPABASE, 'needs local Supabase (npm run db:start)')

function psql(sql: string) {
  execFileSync('docker', ['exec', 'supabase_db_unda-flow', 'psql', '-U', 'postgres', '-c', sql])
}

test('add exercises and a whole set to a block from one Add dialog, then browse sets in the library', async ({
  page,
  request,
}) => {
  await signInViaMailpit(page, request, `e2e-sets-${Date.now()}@example.com`)

  // A class with the reformer.
  await startNewClass(page)
  await page.getByLabel('Title').fill('Sets class')
  // The example comes with its equipment already ticked (reformer and box).
  await expect(
    page
      .getByRole('group', { name: 'Equipment available today' })
      .getByRole('button', { name: 'Reformer' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Create class' }).click()

  const blocks = page.getByRole('list', { name: 'Class blocks' }).locator('> li')
  const footWork = blocks.filter({ has: page.getByRole('heading', { name: 'Foot work' }) })
  const warmUp = blocks.filter({ has: page.getByRole('heading', { name: 'Warm-up' }) })

  // One Add button; the Sets tab adds a whole set in one action.
  await footWork.getByRole('button', { name: /^Add$/ }).click()
  const dialog = page.getByRole('dialog', { name: /Add to/ })
  await dialog.getByRole('tab', { name: /^Sets/ }).click()
  await dialog.getByText('Reformer foot work', { exact: true }).click() // opens the set to show what is in it
  await expect(dialog.getByText('Calf Raises')).toBeVisible()
  await dialog.getByRole('button', { name: 'Add Reformer foot work' }).click()
  await expect(page.getByText('Added 3 exercises.')).toBeVisible()
  // The example already had 3 foot-work exercises; the set appended its 3 after them, in order.
  const rows = footWork.getByRole('list').getByRole('listitem')
  await expect(rows).toHaveCount(6)
  await expect(footWork.getByText(/6 exercises/)).toBeVisible()
  await expect(rows.nth(3)).toContainText('Calf Raises')
  await expect(rows.nth(4)).toContainText('Heels')
  await expect(rows.nth(5)).toContainText('Arches')

  // The Exercises tab: tick several, add them together.
  await warmUp.getByRole('button', { name: /^Add$/ }).click()
  const picker = page.getByRole('dialog', { name: /Add to/ })
  const options = picker.getByRole('listitem').getByRole('button', { pressed: false })
  await options.nth(0).click()
  await options.nth(0).click()
  await picker.getByRole('button', { name: 'Add 2 exercises' }).click()
  await expect(warmUp.getByText(/5 exercises/)).toBeVisible() // 3 from the example + 2 ticked

  // Persisted across a reload.
  await page.reload()
  await expect(
    page
      .getByRole('list', { name: 'Class blocks' })
      .locator('> li')
      .filter({ has: page.getByRole('heading', { name: 'Foot work' }) })
      .getByRole('list')
      .getByRole('listitem'),
  ).toHaveCount(6)

  // Library: the Sets view lists the set by block; a normal user cannot edit it.
  await page.getByRole('link', { name: 'Library', exact: true }).click()
  await page.getByRole('button', { name: 'Sets', exact: true }).click()
  const set = page.getByRole('listitem').filter({ hasText: 'Reformer foot work' })
  await expect(set).toBeVisible()
  await expect(page.getByRole('button', { name: 'New set' })).toHaveCount(0)
  await expect(set.getByRole('button', { name: 'Edit' })).toHaveCount(0)
})

test('an admin creates and edits a shared set in the library', async ({ page, request }) => {
  const stamp = Date.now()
  const email = `e2e-setadmin-${stamp}@example.com`
  await signInViaMailpit(page, request, email)
  psql(
    `update public.profiles set role = 'admin' where id = (select id from auth.users where email = '${email}')`,
  )
  await page.reload()

  await page.getByRole('link', { name: 'Library', exact: true }).click()
  await page.getByRole('button', { name: 'Sets', exact: true }).click()
  await page.getByRole('button', { name: 'New set' }).click()

  const dialog = page.getByRole('dialog', { name: 'New set' })
  await dialog.getByLabel('Name').fill(`Admin warm-up set ${stamp}`)
  await dialog.getByLabel('Block', { exact: true }).selectOption({ label: 'Warm-up' })
  await dialog.getByRole('button', { name: 'Add exercise' }).click()
  const picker = page.getByRole('dialog', { name: /Add to/ })
  const options = picker.getByRole('listitem').getByRole('button', { pressed: false })
  // Each ticked row leaves the "not pressed" list, so the next one is the first again.
  await options.nth(0).click()
  await options.nth(0).click()
  await picker.getByRole('button', { name: 'Add 2 exercises' }).click()
  await dialog.getByRole('button', { name: 'Save set' }).click()

  const created = page.getByRole('listitem').filter({ hasText: `Admin warm-up set ${stamp}` })
  await expect(created).toBeVisible()
  await expect(created.getByText('2 exercises')).toBeVisible()
  await expect(created.getByText('Shared')).toBeVisible()

  // Edit it: rename.
  await created.getByRole('button', { name: 'Edit' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit set' })
  await edit.getByLabel('Name').fill(`Admin warm-up renamed ${stamp}`)
  await edit.getByRole('button', { name: 'Save set' }).click()
  await expect(
    page.getByRole('listitem').filter({ hasText: `Admin warm-up renamed ${stamp}` }),
  ).toBeVisible()
})
