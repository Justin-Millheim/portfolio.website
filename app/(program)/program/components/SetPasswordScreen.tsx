"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

// Shown after a user opens a password-reset link (Supabase fires
// PASSWORD_RECOVERY and gives a temporary session). They set a new password,
// then drop into the app signed in.
export default function SetPasswordScreen({
  supabase,
  onDone,
}: {
  supabase: SupabaseClient | null;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save() {
    setError(null);
    if (!supabase) { setError("Cloud sync isn't available."); return; }
    if (password.length < 6) { setError("Use at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
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
    <div className="t-wrap t-fadein" style={{ paddingTop: 64, maxWidth: 420 }}>
      <div className="t-accent-tr" />
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 48 }}>🔑</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 4px" }}>Set a new password</h1>
        <p style={{ color: "var(--t-muted)", fontSize: 14, margin: 0 }}>Almost done — choose a new password.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          <div className="t-entry-label">New password</div>
          <input type="password" autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </label>
        <label>
          <div className="t-entry-label">Confirm password</div>
          <input type="password" autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
        </label>
        {error && <p style={{ color: "#ff8a5c", fontSize: 13, margin: 0 }}>{error}</p>}
        <button className="t-btn t-btn-primary" onClick={save} disabled={loading}>
          {loading ? "…" : "Save & continue →"}
        </button>
      </div>
    </div>
  );
}
