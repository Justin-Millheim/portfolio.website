"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

// Shown when a password-reset link lands (Supabase fires PASSWORD_RECOVERY).
export default function SetPasswordScreen({
  supabase, onDone,
}: {
  supabase: SupabaseClient | null;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    if (!supabase) { setError("Cloud sync isn't configured."); return; }
    if (password.length < 6) { setError("Use at least 6 characters."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setLoading(false); }
  }

  return (
    <div className="t-app t-fadein" style={{ maxWidth: 420, paddingTop: 72 }}>
      <h1 style={{ fontSize: 24, marginBottom: 6 }}>Set a new password</h1>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16, lineHeight: 1.55 }}>
        Choose a new password for your Tote account.
      </p>
      <label className="t-label">New password</label>
      <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      {error && <p style={{ color: "var(--coral-dk)", fontSize: 13, margin: "10px 0 0" }}>{error}</p>}
      <button className="t-btn t-btn-primary t-btn-block" style={{ marginTop: 16 }} onClick={submit} disabled={loading}>
        {loading ? "…" : "Save password →"}
      </button>
    </div>
  );
}
