import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser Supabase client for /program. Reuses the SAME project as /train
// (NEXT_PUBLIC_SUPABASE_*), just different tables (program_*). Returns null when
// env vars aren't set, which keeps the whole app running in on-device guest mode
// (fully offline) until cloud sync is configured.
let _client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  _client = url && key
    ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
    : null;
  return _client;
}

export function cloudEnabled(): boolean {
  return getSupabase() !== null;
}
