import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser Supabase client. Returns null when env vars aren't set, which keeps
// the whole tool running in on-device guest mode until cloud sync is configured.
let _client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  _client = url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Parse auth tokens that arrive in the URL (password-recovery links).
          detectSessionInUrl: true,
          // Implicit flow puts the recovery token in the URL fragment, so a reset
          // link works even when opened on a DIFFERENT device than it was
          // requested from (PKCE would need a code-verifier from the original
          // browser and silently break cross-device resets).
          flowType: "implicit",
        },
      })
    : null;
  return _client;
}

// Whether cloud sync is available in this deployment.
export function cloudEnabled(): boolean {
  return getSupabase() !== null;
}
