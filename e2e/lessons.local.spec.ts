import { expect, test } from '@playwright/test'
import { signInViaMailpit, startNewClass } from './helpers.ts'

// Needs the local Supabase stack with the seed imported (see library.local.spec.ts).
test.skip(!process.env.E2E_LOCAL_SUPABASE, 'needs local Supabase (npm run db:start)')

test('plan a class from an example, edit it, print it, and duplicate it', async ({
  page,
  request,
}) => {
  await signInViaMailpit(page, request, `e2e-lesson-${Date.now()}@example.com`)

  // The home page is the lesson list; a new user has none.
  await expect(page.getByText('No classes yet')).toBeVisible()
  await startNewClass(page)

  const title = `E2E class ${Date.now()}`
  await page.getByLabel('Title').fill(title)
  // The example comes with its equipment already ticked (reformer and box).
  await expect(
    page
      .getByRole('group', { name: 'Equipment available today' })
      .getByRole('button', { name: 'Reformer' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Create class' }).click()

  // The builder starts with the 12 default blocks.
  await expect(page.getByLabel('Title')).toHaveValue(title)
  const blocks = page.getByRole('list', { name: 'Class blocks' }).locator('> li')
  await expect(blocks).toHaveCount(12)

  // Add an exercise to Foot work from the picker and set its reps.
  const footWork = blocks.filter({ has: page.getByRole('heading', { name: 'Foot work' }) })
  await footWork.getByRole('button', { name: /^Add$/ }).click()
  const dialog = page.getByRole('dialog', { name: /Add to/ })
  const first = dialog.getByRole('listitem').first().getByRole('button')
  const exerciseName = (await first.locator('span.font-semibold').first().textContent())!.trim()
  await first.click()
  await dialog.getByRole('button', { name: 'Add 1 exercise' }).click()

  const row = footWork.getByRole('listitem').filter({ hasText: exerciseName }).first()
  await expect(row).toBeVisible()
  // Rows are collapsed; open this one to edit its details.
  await row.getByRole('button', { expanded: false }).click()
  const saved = page.waitForResponse(
    (r) => r.request().method() === 'PATCH' && r.url().includes('/rest/v1/lesson_items'),
  )
  await row.getByLabel('Reps').fill('12')
  await row.getByLabel('Reps').blur()
  expect((await saved).ok()).toBe(true)

  // Persisted: survives a reload.
  await page.reload()
  const row2 = page
    .getByRole('list', { name: 'Class blocks' })
    .locator('> li')
    .filter({ has: page.getByRole('heading', { name: 'Foot work' }) })
    .getByRole('listitem')
    .filter({ hasText: exerciseName })
    .first()
  await expect(row2).toContainText('12 reps')
  await row2.getByRole('button', { expanded: false }).click()
  await expect(row2.getByLabel('Reps')).toHaveValue('12')

  // Skip a block, then print: the skipped block is absent, the exercise is there.
  const extraLeg = page
    .getByRole('list', { name: 'Class blocks' })
    .locator('> li')
    .filter({ has: page.getByRole('heading', { name: 'Extra leg' }) })
  await extraLeg.getByRole('button', { name: 'Skip block' }).click()
  await expect(extraLeg.getByText('Skipped')).toBeVisible()

  await page.getByRole('link', { name: 'Print / PDF' }).click()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Foot work' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Extra leg' })).toHaveCount(0)
  await expect(page.getByText(exerciseName).first()).toBeVisible()

  // Back on the list, duplicate it: lands in the copy's builder.
  await page.getByRole('link', { name: 'Back to builder' }).click()
  await page.getByRole('link', { name: 'Back to classes' }).click()
  await expect(page.getByRole('link', { name: title })).toBeVisible()
  await page.getByRole('button', { name: 'Duplicate' }).click()
  await expect(page.getByLabel('Title')).toHaveValue(`${title} (copy)`)
})
