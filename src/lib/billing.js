import { requireSupabase } from './supabase'
import { getAccessToken } from './auth'
import { isSupabaseConfigured } from './env'

export const FREE_RECIPE_LIMIT = 30

/**
 * @typedef {{ plan: 'free' | 'yearly', active: boolean, expiresAt: string | null }} PlanStatus
 */

/** @returns {Promise<PlanStatus>} */
export async function getPlanStatus() {
  if (!isSupabaseConfigured()) {
    return { plan: 'free', active: false, expiresAt: null }
  }
  const db = await requireSupabase()
  const { data: sessionData } = await db.auth.getSession()
  const userId = sessionData.session?.user?.id
  if (!userId) return { plan: 'free', active: false, expiresAt: null }

  const { data, error } = await db
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error

  const plan = data?.plan === 'yearly' ? 'yearly' : 'free'
  const expiresAt = data?.plan_expires_at ?? null
  const active = plan === 'yearly' && (!expiresAt || new Date(expiresAt) > new Date())
  return { plan: active ? 'yearly' : 'free', active, expiresAt }
}

/** @returns {Promise<boolean>} whether the server has Stripe configured */
export async function isBillingAvailable() {
  try {
    const res = await fetch('/api/billing/config')
    if (!res.ok) return false
    const body = await res.json()
    return body.billingEnabled === true
  } catch {
    return false
  }
}

/** Kick off Stripe Checkout for the yearly plan (redirects the browser). */
export async function startCheckout() {
  const token = await getAccessToken()
  if (!token) throw new Error('Sign in first to upgrade.')

  const res = await fetch('/api/billing/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.url) {
    throw new Error(body.error ?? 'Could not start checkout')
  }
  window.location.assign(body.url)
}

/** @param {unknown} err */
export function isFreeLimitError(err) {
  return String(/** @type {any} */ (err)?.message ?? err ?? '').includes('FREE_LIMIT_REACHED')
}
