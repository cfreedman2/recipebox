import { requireSupabase } from './supabase'
import { isSupabaseConfigured } from './env'

const DEFAULT_USER_ID = import.meta.env.VITE_DEFAULT_USER_ID

/**
 * Returns the scaffold user id (from env or first user row).
 */
export async function getCurrentUserId() {
  if (!isSupabaseConfigured()) return 'demo-user'
  if (DEFAULT_USER_ID) return DEFAULT_USER_ID

  const { data, error } = await (await requireSupabase())
    .from('users')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (data?.id) return data.id

  const { data: created, error: createError } = await (await requireSupabase())
    .from('users')
    .insert({ display_name: 'Default user' })
    .select('id')
    .single()

  if (createError) throw createError
  return created.id
}
