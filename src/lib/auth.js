import { requireSupabase, getSupabase } from './supabase'
import { isSupabaseConfigured } from './env'

/**
 * Auth is active only in cloud mode (Supabase configured). In local mode the
 * app works without accounts and recipes stay in this browser.
 */
export function isAuthEnabled() {
  return isSupabaseConfigured()
}

/** @returns {Promise<import('@supabase/supabase-js').Session | null>} */
export async function getSession() {
  if (!isAuthEnabled()) return null
  const db = await requireSupabase()
  const { data, error } = await db.auth.getSession()
  if (error) throw error
  return data.session
}

/** @returns {Promise<string | null>} access token for API calls, if signed in */
export async function getAccessToken() {
  const db = await getSupabase()
  if (!db) return null
  const { data } = await db.auth.getSession()
  return data.session?.access_token ?? null
}

/**
 * @param {(session: import('@supabase/supabase-js').Session | null, event: string) => void} callback
 * @returns {Promise<() => void>} unsubscribe
 */
export async function onAuthChange(callback) {
  if (!isAuthEnabled()) return () => {}
  const db = await requireSupabase()
  const { data } = db.auth.onAuthStateChange((event, session) => {
    callback(session, event)
  })
  return () => data.subscription.unsubscribe()
}

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ needsEmailConfirmation: boolean }>}
 */
export async function signUp(email, password) {
  const db = await requireSupabase()
  const { data, error } = await db.auth.signUp({ email, password })
  if (error) throw error
  return { needsEmailConfirmation: !data.session }
}

/**
 * @param {string} email
 * @param {string} password
 */
export async function signIn(email, password) {
  const db = await requireSupabase()
  const { error } = await db.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  const db = await requireSupabase()
  const { error } = await db.auth.signOut()
  if (error) throw error
}

/** @param {string} email */
export async function requestPasswordReset(email) {
  const db = await requireSupabase()
  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  })
  if (error) throw error
}

/** Complete a password-recovery flow (user arrived via the emailed link). */
export async function updatePassword(newPassword) {
  const db = await requireSupabase()
  const { error } = await db.auth.updateUser({ password: newPassword })
  if (error) throw error
}
