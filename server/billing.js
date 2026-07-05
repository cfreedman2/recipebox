import Stripe from 'stripe'
import {
  getSupabaseAdmin,
  getUserFromAuthHeader,
  isSupabaseAdminConfigured,
} from './supabaseAdmin.js'

let stripeClient = null

export function isStripeConfigured() {
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim()
  const price = (process.env.STRIPE_PRICE_ID ?? '').trim()
  return key.startsWith('sk_') && price.startsWith('price_')
}

export function isBillingEnabled() {
  return isStripeConfigured() && isSupabaseAdminConfigured()
}

/** @returns {Stripe} */
function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY.trim())
  }
  return stripeClient
}

/**
 * @param {import('@supabase/supabase-js').User} user
 * @returns {Promise<string>} Stripe customer id (created + stored if missing)
 */
async function getOrCreateStripeCustomer(user) {
  const db = getSupabaseAdmin()
  const { data: profile } = await db
    .from('profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profile?.stripe_customer_id) return profile.stripe_customer_id

  const customer = await getStripe().customers.create({
    email: user.email ?? undefined,
    metadata: { supabase_user_id: user.id },
  })

  const { error } = await db
    .from('profiles')
    .upsert({ user_id: user.id, stripe_customer_id: customer.id })
  if (error) throw error

  return customer.id
}

/**
 * POST /api/billing/create-checkout-session — starts yearly-plan checkout.
 * @type {import('express').RequestHandler}
 */
export async function createCheckoutSession(req, res) {
  try {
    if (!isBillingEnabled()) {
      return res.status(503).json({
        error:
          'Billing is not configured. Set STRIPE_SECRET_KEY, STRIPE_PRICE_ID, and SUPABASE_SERVICE_ROLE_KEY in .env (see README).',
      })
    }

    const user = await getUserFromAuthHeader(req.headers.authorization)
    if (!user) {
      return res.status(401).json({ error: 'Sign in to upgrade.' })
    }

    const customerId = await getOrCreateStripeCustomer(user)
    const origin =
      (process.env.APP_URL ?? '').trim() ||
      req.headers.origin ||
      `http://localhost:${process.env.PORT || 3001}`

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: process.env.STRIPE_PRICE_ID.trim(), quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      subscription_data: { metadata: { supabase_user_id: user.id } },
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('[billing] checkout session failed:', err)
    res.status(500).json({ error: err.message ?? 'Could not start checkout' })
  }
}

/**
 * @param {string} userId
 * @param {{ plan: 'free' | 'yearly', expiresAt: string | null }} update
 */
async function setPlan(userId, update) {
  const { error } = await getSupabaseAdmin()
    .from('profiles')
    .upsert({
      user_id: userId,
      plan: update.plan,
      plan_expires_at: update.expiresAt,
    })
  if (error) throw error
  console.log(`[billing] user ${userId} → plan=${update.plan} expires=${update.expiresAt}`)
}

/** @param {Stripe.Subscription} subscription */
async function applySubscriptionState(subscription) {
  const userId = subscription.metadata?.supabase_user_id
  if (!userId) {
    console.warn('[billing] subscription without supabase_user_id metadata:', subscription.id)
    return
  }

  const active = subscription.status === 'active' || subscription.status === 'trialing'
  const periodEnd = subscription.items?.data?.[0]?.current_period_end
  const expiresAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null

  await setPlan(userId, active ? { plan: 'yearly', expiresAt } : { plan: 'free', expiresAt: null })
}

/**
 * POST /api/billing/webhook — Stripe events keep profiles.plan in sync.
 * Route must receive the RAW request body (signature verification).
 * @type {import('express').RequestHandler}
 */
export async function handleStripeWebhook(req, res) {
  if (!isBillingEnabled()) {
    return res.status(503).json({ error: 'Billing is not configured' })
  }

  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET ?? '').trim()
  let event
  try {
    if (webhookSecret) {
      event = getStripe().webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        webhookSecret,
      )
    } else {
      // Allow local testing without a secret, but insist on it in production.
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET is required in production' })
      }
      event = JSON.parse(req.body.toString())
    }
  } catch (err) {
    console.error('[billing] webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await getStripe().subscriptions.retrieve(
            String(session.subscription),
          )
          if (!subscription.metadata?.supabase_user_id && session.client_reference_id) {
            subscription.metadata = {
              ...subscription.metadata,
              supabase_user_id: session.client_reference_id,
            }
          }
          await applySubscriptionState(subscription)
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await applySubscriptionState(event.data.object)
        break
      }
      default:
        break
    }
    res.json({ received: true })
  } catch (err) {
    console.error('[billing] webhook handling failed:', err)
    res.status(500).json({ error: err.message ?? 'Webhook handling failed' })
  }
}
