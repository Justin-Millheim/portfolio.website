import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser Supabase client for /tote. Returns null when env vars aren't set,
// which keeps the app running in on-device guest mode until cloud sync is
// configured (identical contract to lib/train/supabase.ts and lib/recipes).
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
