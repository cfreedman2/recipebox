import { requireSupabase } from './supabase'
import { isSupabaseConfigured } from './env'

/**
 * Returns the signed-in user's id (cloud mode) or a local placeholder.
 */
export async function getCurrentUserId() {
  if (!isSupabaseConfigured()) return 'local-user'

  const db = await requireSupabase()
  const { data, error } = await db.auth.getSession()
  if (error) throw error
  const userId = data.session?.user?.id
  if (!userId) {
    throw new Error('Not signed in')
  }
  return userId
}
