import { getSupabaseEnv, isSupabaseConfigured } from './env'

export { isSupabaseConfigured } from './env'

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let client = null
/** @type {Promise<import('@supabase/supabase-js').SupabaseClient> | null} */
let clientPromise = null

async function loadClient() {
  if (!isSupabaseConfigured()) return null
  if (client) return client
  if (!clientPromise) {
    const { url, key } = getSupabaseEnv()
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) => {
        client = createClient(url, key)
        return client
      })
      .catch((err) => {
        clientPromise = null
        throw new Error(
          `Supabase package is not installed. Run: npm install @supabase/supabase-js — ${err.message}`,
        )
      })
  }
  return clientPromise
}

/** @returns {Promise<import('@supabase/supabase-js').SupabaseClient | null>} */
export async function getSupabase() {
  return loadClient()
}

/** @returns {Promise<import('@supabase/supabase-js').SupabaseClient>} */
export async function requireSupabase() {
  const db = await loadClient()
  if (!db) {
    throw new Error(
      'Supabase is not configured. Add real VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env',
    )
  }
  return db
}
