import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const MAILPIT = 'http://127.0.0.1:54324'

/** Requests a magic link for `email`, reads it from Mailpit and opens it, so the page is signed in. */
export async function signInViaMailpit(page: Page, request: APIRequestContext, email: string) {
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
}

/**
 * Opens "New class" and picks a starting point: the first example class ("example"), the
 * class named `title`, or an empty class ("blank"). Leaves the page on the short new-class form.
 */
export async function startNewClass(page: Page, from: 'example' | 'blank' = 'example') {
  await page.getByRole('link', { name: 'New class' }).first().click()
  if (from === 'blank') {
    await page.getByRole('link', { name: 'Start blank' }).click()
  } else {
    await page.getByRole('link', { name: 'Use this class' }).first().click()
  }
  await expect(page.getByLabel('Title')).toBeVisible()
}
