/**
 * Shared bits of the local import scripts: reads SUPABASE_URL and SUPABASE_SECRET_KEY (a
 * `sb_secret_...` key, never the client key) and gives a small PostgREST helper. These scripts run
 * on a developer machine only; the secret key never belongs in the client, CI secrets or
 * Cloudflare.
 */
export function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

export function connect() {
  const baseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').replace(
    /\/$/,
    '',
  )
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? ''
  if (!baseUrl) fail('SUPABASE_URL is not set.')
  if (!secretKey.startsWith('sb_secret_')) fail('SUPABASE_SECRET_KEY must be a sb_secret_... key.')

  async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: secretKey,
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string> | undefined),
      },
    })
    if (!res.ok)
      throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${await res.text()}`)
    const text = await res.text()
    return (text ? JSON.parse(text) : null) as T
  }

  return { rest }
}

/** Insert rows, ignoring ones whose primary key already exists. */
export const IGNORE_DUPLICATES = { Prefer: 'resolution=ignore-duplicates,return=minimal' }
