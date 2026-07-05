import { createClient } from '@supabase/supabase-js'

let adminClient = null

function getSupabaseUrl() {
  return (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim()
}

function getServiceRoleKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
}

/** Cloud mode on the server: Supabase URL + service role key present. */
export function isSupabaseAdminConfigured() {
  const url = getSupabaseUrl()
  const key = getServiceRoleKey()
  return Boolean(url && key) && url.includes('supabase.co') && !url.includes('your-project')
}

/** @returns {import('@supabase/supabase-js').SupabaseClient} */
export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(getSupabaseUrl(), getServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return adminClient
}

/**
 * Verify a Supabase access token; returns the user or null.
 * @param {string | undefined} authorizationHeader
 */
export async function getUserFromAuthHeader(authorizationHeader) {
  const token = authorizationHeader?.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length).trim()
    : null
  if (!token) return null

  const { data, error } = await getSupabaseAdmin().auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

/**
 * Express middleware: when cloud mode is configured, requires a signed-in
 * user and puts it on req.user. In local mode (no Supabase) it's a no-op so
 * the app keeps working as a personal tool.
 */
export function requireUserWhenCloud() {
  return async (req, res, next) => {
    if (!isSupabaseAdminConfigured()) return next()
    try {
      const user = await getUserFromAuthHeader(req.headers.authorization)
      if (!user) {
        return res.status(401).json({ error: 'Sign in to use AI parsing.' })
      }
      req.user = user
      return next()
    } catch (err) {
      console.error('[auth] token verification failed:', err.message)
      return res.status(401).json({ error: 'Could not verify your session — sign in again.' })
    }
  }
}
