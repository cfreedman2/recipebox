/**
 * Placeholder used when the optional @supabase/supabase-js package is not
 * installed (vite.config.js aliases the package here). Only ever reached if
 * Supabase env vars are set without the package being installed.
 */
export function createClient() {
  throw new Error(
    'Supabase package is not installed. Run: npm run install:cloud',
  )
}
