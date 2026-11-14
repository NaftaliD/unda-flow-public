import { expect, test } from '@playwright/test'

// Needs the local Supabase stack. Run with:
//   E2E_LOCAL_SUPABASE=1 VITE_SUPABASE_URL=... VITE_SUPABASE_PUBLISHABLE_KEY=... npm run e2e
// (the values are printed by `npm run db:start`). Skipped in CI.
const MAILPIT = 'http://127.0.0.1:54324'

test.skip(!process.env.E2E_LOCAL_SUPABASE, 'needs local Supabase (npm run db:start)')

test('magic link signs in, shows the profile greeting, and signs out', async ({
  page,
  request,
}) => {
  const local = `e2e-${Date.now()}`
  const email = `${local}@example.com`

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Send magic link' }).click()
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()

  let link = ''
  await expect
    .poll(
      async () => {
        const search = await request.get(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
        )
        const id = ((await search.json()) as { messages?: { ID: string }[] }).messages?.[0]?.ID
        if (!id) return ''
        const message = await request.get(`${MAILPIT}/api/v1/message/${id}`)
        const html = ((await message.json()) as { HTML?: string }).HTML ?? ''
        link = (/href="([^"]+)"/.exec(html)?.[1] ?? '').replaceAll('&amp;', '&')
        return link
      },
      { timeout: 20_000 },
    )
    .toContain('/auth/v1/verify')

  await page.goto(link)

  // supabase-js consumes the token from the URL hash, leaving a bare "#"; assert on the path.
  await expect.poll(() => new URL(page.url()).pathname).toBe('/')
  // The greeting uses profiles.display_name, which the signup trigger sets to the email prefix,
  // so this also proves the trigger and the "select own profile" RLS policy work end to end.
  await expect(page.getByRole('heading', { name: `Hello, ${local}` })).toBeVisible()
  await expect(page.getByText('No lessons yet')).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
