import { useQuery } from '@tanstack/react-query'
import { getSession, useSession } from '../auth'
import { supabase } from '../supabaseClient'

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, locale, role')
        .eq('id', userId!)
        .single()
      if (error) throw error
      return data
    },
  })
}

/** The signed-in user's id and admin flag (undefined while loading). */
export function useCurrentUser(): { userId: string | undefined; isAdmin: boolean | undefined } {
  const session = useSession()
  const userId = session?.user.id
  const { data } = useProfile(userId)
  return { userId, isAdmin: data ? data.role === 'admin' : undefined }
}

/** For route guards. */
export async function fetchIsAdmin(): Promise<boolean> {
  const session = await getSession()
  if (!session) return false
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (error) throw error
  return data.role === 'admin'
}
