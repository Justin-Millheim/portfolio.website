"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

// Shown when a password-reset link lands (Supabase fires PASSWORD_RECOVERY).
// Mirrors /train's recovery screen, themed for Mise.
export default function SetPasswordScreen({
  supabase,
  onDone,
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="r-wrap r-narrow r-fadein" style={{ paddingTop: 72, maxWidth: 420 }}>
      <h1 style={{ fontSize: 24, marginBottom: 6 }}>Set a new password</h1>
      <p style={{ color: "var(--r-muted)", fontSize: 14, marginBottom: 16, lineHeight: 1.55 }}>
        Choose a new password for your recipe box.
      </p>
      <label className="r-label">New password</label>
      <input type="password" autoComplete="new-password" value={password}
        onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      {error && <p style={{ color: "var(--r-tomato-dk)", fontSize: 13, margin: "10px 0 0" }}>{error}</p>}
      <button className="r-btn r-btn-primary r-btn-block" style={{ marginTop: 16 }} onClick={submit} disabled={loading}>
        {loading ? "…" : "Save password →"}
      </button>
    </div>
  );
}
