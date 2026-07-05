/** @param {string | undefined} value */
function isPlaceholder(value) {
  if (!value?.trim()) return true
  const v = value.trim()
  return (
    v.includes('your-project') ||
    v.includes('your-anon-key') ||
    v === 'sk-ant-...' ||
    /\.\.\.$/.test(v)
  )
}

export function getSupabaseEnv() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return { url, key }
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseEnv()
  return (
    Boolean(url && key) &&
    !isPlaceholder(url) &&
    !isPlaceholder(key) &&
    url.includes('supabase.co')
  )
}

/** Default: free local storage in this browser — no paid services */
export function isLocalStorageMode() {
  return !isSupabaseConfigured()
}
