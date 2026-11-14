import { useQuery } from '@tanstack/react-query'
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
