// Pagar: 'server-only' membuat build gagal kalau file ini pernah
// ter-import dari komponen client, supaya SERVICE_ROLE_KEY tidak
// pernah bisa bocor ke bundle browser.
import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
